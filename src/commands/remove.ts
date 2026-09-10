import path from 'path';
import fs from 'fs-extra';
import { fetchTemplate } from '../utils/fetcher.js';
import { resolveTemplateSource, resolvePluginSource } from '../utils/paths.js';
import { removePackageJsonPlugin, PluginManifest } from '../utils/json.js';
import { runPackageInstall } from '../utils/installer.js';
import { writeFileAtomic } from '../utils/atomicWrite.js';
import { pruneEmptyParentDirs } from '../utils/pruneEmptyDirs.js';
import { revertMergeFragment } from '../utils/anchors.js';
import { removePackageJsonDependencies, removeTsconfigPaths } from '../utils/jsonMerge.js';
import {
  readLockfile,
  writeLockfile,
  findDependents,
  findAppliedBlocksGatedOn,
  findOtherAppliedEntryForTarget,
  findAppliedInjectionsForTarget,
  removePluginEntry,
  deferAppliedBlocks,
  Lockfile,
  LockfileInjectionEntry,
} from '../utils/lockfile.js';

/**
 * Reverts one `overwrite`-strategy injection. If another still-applied injection (any plugin)
 * targets the same path — e.g. blog's plain BlogPostEditDialog.tsx variant, after storage's
 * gated override of it is removed — that variant is restored instead of falling back to core.
 * Only when no such sibling exists does this fall back to core's copy (or delete, if core has
 * no opinion on this path at all, which is now the common case for plugin-owned files since
 * core is pristine).
 */
const revertOverwriteInjection = async (
  coreRoot: string,
  targetRoot: string,
  target: string,
  lockfile: Lockfile,
  excluded: { plugin: string; source: string },
  isDev: boolean,
  pluginTemplateCache: Map<string, string>
): Promise<void> => {
  const targetPath = path.join(targetRoot, target);
  const other = findOtherAppliedEntryForTarget(lockfile, target, excluded);

  if (other) {
    let ownerRoot = pluginTemplateCache.get(other.plugin);
    if (!ownerRoot) {
      ownerRoot = path.join(targetRoot, `.inithium-temp-revert-${other.plugin}`);
      await fetchTemplate(resolvePluginSource(other.plugin, isDev), ownerRoot, isDev);
      pluginTemplateCache.set(other.plugin, ownerRoot);
    }
    const otherSrcPath = path.join(ownerRoot, other.injection.source);
    if (await fs.pathExists(otherSrcPath)) {
      const stat = await fs.stat(otherSrcPath);
      if (stat.isDirectory()) {
        await fs.copy(otherSrcPath, targetPath, { overwrite: true });
      } else {
        await writeFileAtomic(targetPath, await fs.readFile(otherSrcPath, 'utf8'));
      }
      return;
    }
  }

  const coreEquivalentPath = path.join(coreRoot, target);
  if (await fs.pathExists(coreEquivalentPath)) {
    await fs.copy(coreEquivalentPath, targetPath, { overwrite: true });
  } else {
    const stat = await fs.stat(targetPath).catch(() => null);
    await fs.remove(targetPath);
    if (stat && !stat.isDirectory()) {
      await pruneEmptyParentDirs(targetPath, targetRoot);
    }
  }
};

const revertOneInjection = async (
  coreRoot: string,
  targetRoot: string,
  owningPlugin: string,
  injection: LockfileInjectionEntry,
  lockfile: Lockfile,
  isDev: boolean,
  pluginTemplateCache: Map<string, string>
): Promise<void> => {
  const strategy = injection.strategy ?? 'overwrite';
  const targetPath = path.join(targetRoot, injection.target);

  switch (strategy) {
    case 'merge': {
      if (!(await fs.pathExists(targetPath))) return;
      const current = await fs.readFile(targetPath, 'utf8');
      await writeFileAtomic(targetPath, revertMergeFragment(current, owningPlugin));
      return;
    }
    case 'package-json-merge': {
      const stillNeeded = findAppliedInjectionsForTarget(lockfile, injection.target, {
        plugin: owningPlugin,
        source: injection.source,
      }).reduce<Record<string, string>>((acc, ref) => ({ ...acc, ...(ref.injection.jsonDependencies ?? {}) }), {});
      await removePackageJsonDependencies(targetPath, injection.jsonDependencies ?? {}, stillNeeded);
      return;
    }
    case 'tsconfig-paths-merge': {
      const keysStillNeeded = new Set(
        findAppliedInjectionsForTarget(lockfile, injection.target, {
          plugin: owningPlugin,
          source: injection.source,
        }).flatMap((ref) => Object.keys(ref.injection.jsonPaths ?? {}))
      );
      const keysToRemove = Object.keys(injection.jsonPaths ?? {}).filter((key) => !keysStillNeeded.has(key));
      await removeTsconfigPaths(targetPath, keysToRemove);
      return;
    }
    case 'overwrite':
    default:
      await revertOverwriteInjection(
        coreRoot,
        targetRoot,
        injection.target,
        lockfile,
        { plugin: owningPlugin, source: injection.source },
        isDev,
        pluginTemplateCache
      );
      return;
  }
};

export const removeCommand = async (
  pluginName: string,
  options: { dev?: boolean; skipInstall?: boolean; force?: boolean }
): Promise<void> => {
  const targetRoot = process.cwd();
  const isDev = Boolean(options.dev);
  const coreSource = resolveTemplateSource(isDev);

  const tempCoreDir = path.join(targetRoot, `.inithium-temp-core`);
  const pluginTemplateCache = new Map<string, string>();

  try {
    let lockfile = await readLockfile(targetRoot);
    const pluginEntry = lockfile.plugins[pluginName];

    if (!pluginEntry) {
      throw new Error(
        `Plugin "${pluginName}" is not tracked in this workspace's lockfile — nothing to remove.`
      );
    }

    const dependents = findDependents(lockfile, pluginName);
    if (dependents.length > 0 && !options.force) {
      throw new Error(
        `Cannot remove plugin "${pluginName}": the following installed plugin(s) depend on it: ` +
          `${dependents.join(', ')}. Use --force to remove anyway.`
      );
    }
    if (dependents.length > 0 && options.force) {
      console.warn(
        `Warning: removing "${pluginName}" while these plugins still depend on it: ${dependents.join(', ')}.`
      );
    }

    await fetchTemplate(coreSource, tempCoreDir, isDev);

    for (const injection of pluginEntry.injections) {
      if (injection.status !== 'applied') continue;
      await revertOneInjection(tempCoreDir, targetRoot, pluginName, injection, lockfile, isDev, pluginTemplateCache);
    }

    const gatedBlocks = findAppliedBlocksGatedOn(lockfile, pluginName);
    for (const ref of gatedBlocks) {
      await revertOneInjection(tempCoreDir, targetRoot, ref.plugin, ref.injection, lockfile, isDev, pluginTemplateCache);
    }
    lockfile = deferAppliedBlocks(lockfile, gatedBlocks);

    const syntheticManifest: PluginManifest = {
      name: pluginName,
      version: pluginEntry.version,
      description: '',
      dependencies: {
        npm: pluginEntry.npmDependencies,
        plugins: pluginEntry.dependencies,
      },
    };

    const stillNeededDeps = Object.entries(lockfile.plugins)
      .filter(([name]) => name !== pluginName)
      .reduce<Record<string, string>>((acc, [, entry]) => ({ ...acc, ...entry.npmDependencies }), {});

    await removePackageJsonPlugin(targetRoot, syntheticManifest, stillNeededDeps);

    lockfile = removePluginEntry(lockfile, pluginName);
    await writeLockfile(targetRoot, lockfile);

    if (!options.skipInstall) {
      await runPackageInstall(targetRoot);
    }
  } finally {
    await fs.remove(tempCoreDir);
    for (const dir of pluginTemplateCache.values()) {
      await fs.remove(dir);
    }
  }
};
