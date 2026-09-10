import path from 'path';
import fs from 'fs-extra';
import { readJsonFile, writeJsonFile } from './json.js';
import type { InjectionStrategy } from './json.js';

export interface LockfileInjectionEntry {
  target: string;
  source: string;
  requires: string | null;
  status: 'applied' | 'deferred';
  /** Defaults to 'overwrite' for entries written before this field existed. */
  strategy: InjectionStrategy;
  /** package-json-merge only: the dependency keys/values this specific injection contributed. */
  jsonDependencies?: Record<string, string>;
  /** tsconfig-paths-merge only: the path-alias keys/values this specific injection contributed. */
  jsonPaths?: Record<string, string[]>;
}

export interface LockfilePluginEntry {
  version: string;
  installedAt: string;
  dependencies: string[];
  npmDependencies: Record<string, string>;
  injections: LockfileInjectionEntry[];
}

export interface Lockfile {
  version: 1;
  plugins: Record<string, LockfilePluginEntry>;
}

const LOCKFILE_DIR = '.inithium';
const LOCKFILE_FILE = 'plugins.lock.json';

export const getLockfilePath = (targetRoot: string): string =>
  path.join(targetRoot, LOCKFILE_DIR, LOCKFILE_FILE);

export const readLockfile = async (targetRoot: string): Promise<Lockfile> =>
  (await readJsonFile<Lockfile>(getLockfilePath(targetRoot))) ?? { version: 1, plugins: {} };

export const writeLockfile = async (targetRoot: string, lockfile: Lockfile): Promise<void> => {
  await fs.ensureDir(path.join(targetRoot, LOCKFILE_DIR));
  await writeJsonFile(getLockfilePath(targetRoot), lockfile);
};

export const isPluginInstalled = (lockfile: Lockfile, pluginName: string): boolean =>
  pluginName in lockfile.plugins;

export const findMissingHardDependencies = (lockfile: Lockfile, required: string[]): string[] =>
  required.filter((dep) => !isPluginInstalled(lockfile, dep));

export const findDependents = (lockfile: Lockfile, pluginName: string): string[] =>
  Object.entries(lockfile.plugins)
    .filter(([, entry]) => entry.dependencies.includes(pluginName))
    .map(([name]) => name);

export interface GatedBlockRef {
  plugin: string;
  injection: LockfileInjectionEntry;
}

export const findDeferredBlocksRequiring = (lockfile: Lockfile, pluginName: string): GatedBlockRef[] => {
  const result: GatedBlockRef[] = [];
  for (const [name, entry] of Object.entries(lockfile.plugins)) {
    for (const injection of entry.injections) {
      if (injection.status === 'deferred' && injection.requires === pluginName) {
        result.push({ plugin: name, injection });
      }
    }
  }
  return result;
};

export const findAppliedBlocksGatedOn = (lockfile: Lockfile, pluginName: string): GatedBlockRef[] => {
  const result: GatedBlockRef[] = [];
  for (const [name, entry] of Object.entries(lockfile.plugins)) {
    for (const injection of entry.injections) {
      if (injection.status === 'applied' && injection.requires === pluginName) {
        result.push({ plugin: name, injection });
      }
    }
  }
  return result;
};

export const upsertPluginEntry = (
  lockfile: Lockfile,
  pluginName: string,
  entry: LockfilePluginEntry
): Lockfile => ({ ...lockfile, plugins: { ...lockfile.plugins, [pluginName]: entry } });

export const removePluginEntry = (lockfile: Lockfile, pluginName: string): Lockfile => {
  const remainingPlugins = { ...lockfile.plugins };
  delete remainingPlugins[pluginName];
  return { ...lockfile, plugins: remainingPlugins };
};

/**
 * A single injection entry's true identity is (target, source), not bare target: the same
 * plugin can legitimately declare two entries for one target with different sources gated on
 * different `requires` (e.g. blog's plain vs. `requires:"storage"` BlogPostEditDialog.tsx
 * variants). Matching on target alone would flip both together.
 */
const injectionKey = (injection: Pick<LockfileInjectionEntry, 'target' | 'source'>): string =>
  `${injection.target}::${injection.source}`;

const setInjectionStatus = (
  lockfile: Lockfile,
  refs: GatedBlockRef[],
  status: 'applied' | 'deferred'
): Lockfile => {
  let plugins = lockfile.plugins;
  for (const { plugin, injection } of refs) {
    const entry = plugins[plugin];
    if (!entry) continue;
    plugins = {
      ...plugins,
      [plugin]: {
        ...entry,
        injections: entry.injections.map((inj) =>
          injectionKey(inj) === injectionKey(injection) ? { ...inj, status } : inj
        ),
      },
    };
  }
  return { ...lockfile, plugins };
};

export const applyDeferredBlocks = (lockfile: Lockfile, refs: GatedBlockRef[]): Lockfile =>
  setInjectionStatus(lockfile, refs, 'applied');

export const deferAppliedBlocks = (lockfile: Lockfile, refs: GatedBlockRef[]): Lockfile =>
  setInjectionStatus(lockfile, refs, 'deferred');

/** Sets fields (e.g. jsonDependencies/jsonPaths) on one specific injection entry, identified by (target, source). */
export const setInjectionExtras = (
  lockfile: Lockfile,
  plugin: string,
  target: string,
  source: string,
  extra: Partial<Pick<LockfileInjectionEntry, 'jsonDependencies' | 'jsonPaths'>>
): Lockfile => {
  const entry = lockfile.plugins[plugin];
  if (!entry) return lockfile;
  return {
    ...lockfile,
    plugins: {
      ...lockfile.plugins,
      [plugin]: {
        ...entry,
        injections: entry.injections.map((inj) =>
          injectionKey(inj) === injectionKey({ target, source }) ? { ...inj, ...extra } : inj
        ),
      },
    },
  };
};

export interface InjectionRef {
  plugin: string;
  injection: LockfileInjectionEntry;
}

/**
 * Finds another currently-applied injection (any plugin) targeting the same path, excluding
 * one specific (plugin, source) pair. Used by `remove` so reverting one variant of a
 * multi-variant single-owner file (e.g. storage's gated override of blog's
 * BlogPostEditDialog.tsx) restores whichever other variant is still applicable, instead of
 * deleting the file outright just because a (now-pristine) core has no opinion on it.
 */
export const findOtherAppliedEntryForTarget = (
  lockfile: Lockfile,
  target: string,
  exclude: { plugin: string; source: string }
): InjectionRef | undefined => {
  for (const [plugin, entry] of Object.entries(lockfile.plugins)) {
    for (const injection of entry.injections) {
      if (injection.target !== target || injection.status !== 'applied') continue;
      if (plugin === exclude.plugin && injection.source === exclude.source) continue;
      return { plugin, injection };
    }
  }
  return undefined;
};

/**
 * Finds every currently-applied injection (any plugin) targeting the same path, optionally
 * excluding one (plugin, source) pair. Used to reference-count package-json-merge/
 * tsconfig-paths-merge contributions across plugins before removing any of them.
 */
export const findAppliedInjectionsForTarget = (
  lockfile: Lockfile,
  target: string,
  exclude?: { plugin: string; source: string }
): InjectionRef[] => {
  const result: InjectionRef[] = [];
  for (const [plugin, entry] of Object.entries(lockfile.plugins)) {
    for (const injection of entry.injections) {
      if (injection.target !== target || injection.status !== 'applied') continue;
      if (exclude && plugin === exclude.plugin && injection.source === exclude.source) continue;
      result.push({ plugin, injection });
    }
  }
  return result;
};
