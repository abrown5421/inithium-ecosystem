// Text-splicing engine for merge-strategy plugin injections. A mergeable shared file ships
// permanent bare "// inithium:anchor:<id>" comment lines at each real insertion point. A
// plugin's merge fragment is authored with the same convention, letting it be sliced into
// {anchorId -> content} segments and spliced into the target immediately before each matching
// anchor line, wrapped in "// inithium:block:<plugin>:<id>:start/end" markers so a later
// `remove` can find and delete exactly this plugin's contribution without disturbing anyone
// else's, and so a repeated `add` can safely replace its own prior block instead of duplicating it.

const ANCHOR_LINE_PATTERNS: RegExp[] = [
  /^\/\/\s*inithium:anchor:([a-zA-Z0-9_-]+)\s*$/,
  /^\{\/\*\s*inithium:anchor:([a-zA-Z0-9_-]+)\s*\*\/\}\s*$/,
];

const blockLinePatterns = (kind: 'start' | 'end'): RegExp[] => [
  new RegExp(`^//\\s*inithium:block:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):${kind}\\s*$`),
  new RegExp(`^\\{/\\*\\s*inithium:block:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):${kind}\\s*\\*/\\}\\s*$`),
];

export const matchAnchorLine = (line: string): string | null => {
  const trimmed = line.trim();
  for (const pattern of ANCHOR_LINE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export interface BlockMarker {
  plugin: string;
  anchorId: string;
}

export const matchBlockMarker = (line: string, kind: 'start' | 'end'): BlockMarker | null => {
  const trimmed = line.trim();
  for (const pattern of blockLinePatterns(kind)) {
    const match = trimmed.match(pattern);
    if (match) return { plugin: match[1], anchorId: match[2] };
  }
  return null;
};

const splitLines = (content: string): string[] => content.split(/\r\n|\n/);

// Preserves whichever line ending the target file already used - the fragment's own convention
// never matters here, since fragment content is always re-split/re-joined against the target's
// style. Without this, any file that goes through a merge/revert cycle would have its line
// endings silently normalized to LF even if it was authored/checked in with CRLF.
const detectEol = (content: string): string => (content.includes('\r\n') ? '\r\n' : '\n');

export interface AnchorSection {
  anchorId: string;
  content: string;
}

/**
 * Slices a plugin's merge fragment into per-anchor segments. Each segment's content is
 * everything that appeared before that anchor comment in the fragment. Content trailing the
 * last anchor comment (with nowhere to go) is an authoring error, not silently dropped.
 */
export const parseFragmentSections = (fragmentContent: string): AnchorSection[] => {
  const lines = splitLines(fragmentContent);
  const sections: AnchorSection[] = [];
  let buffer: string[] = [];

  for (const line of lines) {
    const anchorId = matchAnchorLine(line);
    if (anchorId) {
      sections.push({ anchorId, content: buffer.join('\n') });
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  if (buffer.some((line) => line.trim().length > 0)) {
    throw new Error(
      `Merge fragment has content after its last "inithium:anchor:" comment with nowhere to attach it: ${JSON.stringify(
        buffer.join('\n').slice(0, 200)
      )}`
    );
  }

  return sections;
};

export interface AnchorValidationIssue {
  file: string;
  message: string;
}

/**
 * Pre-flight check, run before any file is mutated: every anchor a fragment wants to fill
 * must exist exactly once in the target, and any existing block markers must be well-formed
 * and properly nested. Anything else here means the target has drifted out of sync with the
 * plugin (or was hand-edited) and inserting blindly would corrupt the file.
 */
export const validateAnchorsPresent = (
  content: string,
  anchorIds: string[],
  filePath: string
): AnchorValidationIssue[] => {
  const issues: AnchorValidationIssue[] = [];
  const lines = splitLines(content);

  for (const id of new Set(anchorIds)) {
    const count = lines.filter((line) => matchAnchorLine(line) === id).length;
    if (count === 0) {
      issues.push({
        file: filePath,
        message: `Anchor "inithium:anchor:${id}" not found in ${filePath} — has this file drifted out of sync with the plugin, or been modified outside the CLI?`,
      });
    } else if (count > 1) {
      issues.push({
        file: filePath,
        message: `Anchor "inithium:anchor:${id}" appears ${count} times in ${filePath}, expected exactly once.`,
      });
    }
  }

  const openStack: BlockMarker[] = [];
  for (const line of lines) {
    const start = matchBlockMarker(line, 'start');
    if (start) {
      openStack.push(start);
      continue;
    }
    const end = matchBlockMarker(line, 'end');
    if (end) {
      const top = openStack.pop();
      if (!top || top.plugin !== end.plugin || top.anchorId !== end.anchorId) {
        issues.push({
          file: filePath,
          message: `Mismatched inithium:block markers in ${filePath}: an end marker for "${end.plugin}:${end.anchorId}" does not close the currently open block${
            top ? ` ("${top.plugin}:${top.anchorId}")` : ''
          }.`,
        });
      }
    }
  }
  if (openStack.length > 0) {
    issues.push({
      file: filePath,
      message: `Unterminated inithium:block marker(s) in ${filePath}: ${openStack
        .map((b) => `${b.plugin}:${b.anchorId}`)
        .join(', ')}.`,
    });
  }

  return issues;
};

/**
 * Removes every "inithium:block:<plugin>:...:start/end" span belonging to `plugin` from
 * `content`. When `anchorId` is given, only that anchor's block is removed (used by `add`'s
 * idempotency guard); otherwise every block the plugin owns in this file is stripped (used by
 * `remove`, since one merge fragment commonly contributes blocks at several anchors in the
 * same file).
 */
export const removePluginBlocks = (content: string, plugin: string, anchorId?: string): string => {
  const eol = detectEol(content);
  const lines = splitLines(content);
  const result: string[] = [];
  let skipping = false;
  let skippingAnchor: string | null = null;

  for (const line of lines) {
    if (!skipping) {
      const start = matchBlockMarker(line, 'start');
      if (start && start.plugin === plugin && (!anchorId || start.anchorId === anchorId)) {
        skipping = true;
        skippingAnchor = start.anchorId;
        continue;
      }
      result.push(line);
      continue;
    }

    const end = matchBlockMarker(line, 'end');
    if (end && end.plugin === plugin && end.anchorId === skippingAnchor) {
      skipping = false;
      skippingAnchor = null;
    }
    // every other line inside the span (including the end marker itself) is dropped
  }

  if (skipping) {
    throw new Error(
      `Unterminated inithium:block for plugin "${plugin}" (anchor "${skippingAnchor}") — a start marker was found with no matching end marker.`
    );
  }

  return result.join(eol);
};

const buildBlockLines = (plugin: string, anchorId: string, blockContent: string): string[] => {
  const inner = blockContent.length > 0 ? splitLines(blockContent) : [];
  return [`// inithium:block:${plugin}:${anchorId}:start`, ...inner, `// inithium:block:${plugin}:${anchorId}:end`];
};

/**
 * Inserts `plugin`'s content for one anchor immediately before that anchor's bare comment
 * line, stacking after any other plugins' existing blocks at the same anchor. Idempotent: any
 * pre-existing block for this exact (plugin, anchorId) pair is deleted first, so re-running
 * `add` (after a failure, or on a plugin version bump) replaces rather than duplicates it.
 */
export const insertAtAnchor = (content: string, anchorId: string, plugin: string, blockContent: string): string => {
  const eol = detectEol(content);
  const cleaned = removePluginBlocks(content, plugin, anchorId);
  const lines = splitLines(cleaned);
  const anchorIndexes = lines.reduce<number[]>((acc, line, idx) => {
    if (matchAnchorLine(line) === anchorId) acc.push(idx);
    return acc;
  }, []);

  if (anchorIndexes.length === 0) {
    throw new Error(`Anchor "inithium:anchor:${anchorId}" not found — cannot insert plugin "${plugin}"'s content.`);
  }
  if (anchorIndexes.length > 1) {
    throw new Error(`Anchor "inithium:anchor:${anchorId}" appears ${anchorIndexes.length} times — expected exactly once.`);
  }

  const insertAt = anchorIndexes[0];
  const blockLines = buildBlockLines(plugin, anchorId, blockContent);
  return [...lines.slice(0, insertAt), ...blockLines, ...lines.slice(insertAt)].join(eol);
};

/** Applies every anchor section of a plugin's merge fragment to the target file's content. */
export const applyMergeFragment = (targetContent: string, fragmentContent: string, plugin: string): string => {
  const sections = parseFragmentSections(fragmentContent);
  if (sections.length === 0) {
    throw new Error(`Merge fragment for plugin "${plugin}" contains no "inithium:anchor:" markers — nothing to merge.`);
  }
  return sections.reduce((content, section) => insertAtAnchor(content, section.anchorId, plugin, section.content), targetContent);
};

/** Strips every block `plugin` owns anywhere in the file — the `remove`-side counterpart of applyMergeFragment. */
export const revertMergeFragment = (targetContent: string, plugin: string): string =>
  removePluginBlocks(targetContent, plugin);
