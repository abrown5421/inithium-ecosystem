import path from 'path';
import fs from 'fs-extra';
import { fetchTemplate } from '../utils/fetcher.js';
import {
  readJsonFile,
  updatePackageJsonWithPlugin,
  PluginManifest,
  PluginManifestInjection,
  InjectionStrategy,
} from '../utils/json.js';
import { runPackageInstall } from '../utils/installer.js';
import { resolvePluginSource } from '../utils/paths.js';
import { writeFileAtomic } from '../utils/atomicWrite.js';
import { applyMergeFragment, parseFragmentSections, validateAnchorsPresent } from '../utils/anchors.js';
import { mergePackageJsonDependencies, mergeTsconfigPaths } from '../utils/jsonMerge.js';
import {
  readLockfile,
  writeLockfile,
  findMissingHardDependencies,
  findDeferredBlocksRequiring,
  upsertPluginEntry,
  applyDeferredBlocks,
  setInjectionExtras,
  LockfileInjectionEntry,
} from '../utils/lockfile.js';

const readFileIfExists = async (filePath: string): Promise<string | null> =>
  (await fs.pathExists(filePath)) ? fs.readFile(filePath, 'utf8') : null;

const applyOverwriteInjection = async (srcRoot: string, targetRoot: string, target: string, source: string): Promise<void> => {
  const srcPath = path.join(srcRoot, source);
  const destPath = path.join(targetRoot, target);
  if (!(await fs.pathExists(srcPath))) return;

  const srcStat = await fs.stat(srcPath);
  if (srcStat.isDirectory()) {
    await fs.copy(srcPath, destPath, { overwrite: true });
    return;
  }
  await writeFileAtomic(destPath, await fs.readFile(srcPath, 'utf8'));
};

const applyMergeInjection = async (
  srcRoot: string,
  targetRoot: string,
  target: string,
  source: string,
  plugin: string
): Promise<void> => {
  const fragmentContent = await readFileIfExists(path.join(srcRoot, source));
  if (fragmentContent === null) {
    throw new Error(`Merge fragment "${source}" not found for plugin "${plugin}".`);
  }

  const destPath = path.join(targetRoot, target);
  const targetContent = await readFileIfExists(destPath);
  if (targetContent === null) {
    throw new Error(
      `Cannot merge into "${target}" — the file does not exist in this workspace. A merge-strategy injection requires the target to already be shipped by core or a previously-installed plugin.`
    );
  }

  const anchorIds = parseFragmentSections(fragmentContent).map((section) => section.anchorId);
  const issues = validateAnchorsPresent(targetContent, anchorIds, target);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.message).join('\n'));
  }

  await writeFileAtomic(destPath, applyMergeFragment(targetContent, fragmentContent, plugin));
};

const applyPackageJsonMergeInjection = async (
  srcRoot: string,
  targetRoot: string,
  target: string,
  source: string
): Promise<Record<string, string>> => {
  const fragment = await readJsonFile<{ dependencies?: Record<string, string> }>(path.join(srcRoot, source));
  const deps = fragment?.dependencies ?? {};
  await mergePackageJsonDependencies(path.join(targetRoot, target), deps);
  return deps;
};

const applyTsconfigPathsMergeInjection = async (
  srcRoot: string,
  targetRoot: string,
  target: string,
  source: string
): Promise<Record<string, string[]>> => {
  const fragment = (await readJsonFile<Record<string, string[]>>(path.join(srcRoot, source))) ?? {};
  await mergeTsconfigPaths(path.join(targetRoot, target), fragment);
  return fragment;
};

type InjectionExtras = Partial<Pick<LockfileInjectionEntry, 'jsonDependencies' | 'jsonPaths'>>;

interface ApplyableInjection {
  target: string;
  source: string;
  strategy?: InjectionStrategy;
}

const applyInjection = async (
  srcRoot: string,
  targetRoot: string,
  plugin: string,
  injection: ApplyableInjection
): Promise<InjectionExtras> => {
  const strategy = injection.strategy ?? 'overwrite';
  switch (strategy) {
    case 'merge':
      await applyMergeInjection(srcRoot, targetRoot, injection.target, injection.source, plugin);
      return {};
    case 'package-json-merge':
      return { jsonDependencies: await applyPackageJsonMergeInjection(srcRoot, targetRoot, injection.target, injection.source) };
    case 'tsconfig-paths-merge':
      return { jsonPaths: await applyTsconfigPathsMergeInjection(srcRoot, targetRoot, injection.target, injection.source) };
    case 'overwrite':
    default:
      await applyOverwriteInjection(srcRoot, targetRoot, injection.target, injection.source);
      return {};
  }
};

/**
 * Validates every merge-strategy injection this run would actually apply *before* mutating
 * anything, so a missing/duplicated anchor aborts the whole `add` instead of leaving some
 * files changed and others not.
 */
const preflightMergeInjections = async (
  tempPluginDir: string,
  targetRoot: string,
  pluginName: string,
  injections: PluginManifestInjection[],
  isRequirementSatisfied: (requires: string | null) => boolean
): Promise<void> => {
  const issues: string[] = [];

  for (const injection of injections) {
    if ((injection.strategy ?? 'overwrite') !== 'merge') continue;
    if (!isRequirementSatisfied(injection.requires ?? null)) continue; // will be deferred, not applied now

    const fragmentContent = await readFileIfExists(path.join(tempPluginDir, injection.source));
    if (fragmentContent === null) {
      issues.push(`Merge fragment "${injection.source}" not found for plugin "${pluginName}".`);
      continue;
    }
    const targetContent = await readFileIfExists(path.join(targetRoot, injection.target));
    if (targetContent === null) {
      issues.push(`Cannot merge into "${injection.target}" — the file does not exist in this workspace.`);
      continue;
    }
    const anchorIds = parseFragmentSections(fragmentContent).map((section) => section.anchorId);
    issues.push(...validateAnchorsPresent(targetContent, anchorIds, injection.target).map((issue) => issue.message));
  }

  if (issues.length > 0) {
    throw new Error(`Cannot add plugin "${pluginName}":\n${issues.join('\n')}`);
  }
};

export const addCommand = async (
  pluginName: string,
  options: { dev?: boolean; skipInstall?: boolean }
): Promise<void> => {
  const targetRoot = process.cwd();
  const isDev = Boolean(options.dev);
  const pluginSource = resolvePluginSource(pluginName, isDev);

  const tempPluginDir = path.join(targetRoot, `.inithium-temp-${pluginName}`);
  const reconcileTempDirs: string[] = [];

  try {
    let lockfile = await readLockfile(targetRoot);

    await fetchTemplate(pluginSource, tempPluginDir, isDev);

    const manifestPath = path.join(tempPluginDir, 'manifest.json');
    const manifest = await readJsonFile<PluginManifest>(manifestPath);

    if (!manifest) {
      throw new Error(`Invalid plugin: manifest.json missing in ${pluginName}`);
    }

    const hardDeps = manifest.dependencies?.plugins ?? [];
    const missingHardDeps = findMissingHardDependencies(lockfile, hardDeps);
    if (missingHardDeps.length > 0) {
      throw new Error(
        `Cannot add plugin "${pluginName}": missing required plugin(s): ${missingHardDeps.join(', ')}. ` +
          `Install them first, e.g. "inithium add ${missingHardDeps[0]}".`
      );
    }

    await preflightMergeInjections(
      tempPluginDir,
      targetRoot,
      pluginName,
      manifest.injections ?? [],
      (requires) => requires === null || requires in lockfile.plugins
    );

    const injectionEntries: LockfileInjectionEntry[] = [];
    for (const injection of manifest.injections ?? []) {
      const requires = injection.requires ?? null;
      const shouldApply = requires === null || requires in lockfile.plugins;
      const strategy = injection.strategy ?? 'overwrite';

      const extras = shouldApply ? await applyInjection(tempPluginDir, targetRoot, pluginName, injection) : {};

      injectionEntries.push({
        target: injection.target,
        source: injection.source,
        requires,
        status: shouldApply ? 'applied' : 'deferred',
        strategy,
        ...extras,
      });
    }

    lockfile = upsertPluginEntry(lockfile, pluginName, {
      version: manifest.version,
      installedAt: new Date().toISOString(),
      dependencies: hardDeps,
      npmDependencies: manifest.dependencies?.npm ?? {},
      injections: injectionEntries,
    });

    await updatePackageJsonWithPlugin(targetRoot, manifest);

    const toReconcile = findDeferredBlocksRequiring(lockfile, pluginName);
    const dependentPluginNames = [...new Set(toReconcile.map((ref) => ref.plugin))];

    for (const dependentPluginName of dependentPluginNames) {
      const reconcileTempDir = path.join(targetRoot, `.inithium-temp-${dependentPluginName}-reconcile`);
      reconcileTempDirs.push(reconcileTempDir);

      await fetchTemplate(resolvePluginSource(dependentPluginName, isDev), reconcileTempDir, isDev);

      const refsForPlugin = toReconcile.filter((ref) => ref.plugin === dependentPluginName);
      for (const ref of refsForPlugin) {
        const extras = await applyInjection(reconcileTempDir, targetRoot, dependentPluginName, ref.injection);
        lockfile = setInjectionExtras(lockfile, dependentPluginName, ref.injection.target, ref.injection.source, extras);
      }
    }

    lockfile = applyDeferredBlocks(lockfile, toReconcile);

    await writeLockfile(targetRoot, lockfile);

    if (!options.skipInstall) {
      await runPackageInstall(targetRoot);
    }
  } finally {
    await fs.remove(tempPluginDir);
    for (const dir of reconcileTempDirs) {
      await fs.remove(dir);
    }
  }
};
