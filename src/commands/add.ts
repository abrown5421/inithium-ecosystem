import path from 'path';
import fs from 'fs-extra';
import { fetchTemplate } from '../utils/fetcher.js';
import { readJsonFile, updatePackageJsonWithPlugin, PluginManifest } from '../utils/json.js';
import { runPackageInstall } from '../utils/installer.js';
import { resolvePluginSource } from '../utils/paths.js';
import {
  readLockfile,
  writeLockfile,
  findMissingHardDependencies,
  findDeferredBlocksRequiring,
  upsertPluginEntry,
  applyDeferredBlocks,
  LockfileInjectionEntry,
} from '../utils/lockfile.js';

const copyInjection = async (srcRoot: string, targetRoot: string, target: string, source: string) => {
  const srcPath = path.join(srcRoot, source);
  const destPath = path.join(targetRoot, target);

  if (await fs.pathExists(srcPath)) {
    await fs.copy(srcPath, destPath, { overwrite: true });
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

    const injectionEntries: LockfileInjectionEntry[] = [];
    for (const injection of manifest.injections ?? []) {
      const requires = injection.requires ?? null;
      const shouldApply = requires === null || requires in lockfile.plugins;

      if (shouldApply) {
        await copyInjection(tempPluginDir, targetRoot, injection.target, injection.source);
      }

      injectionEntries.push({
        target: injection.target,
        source: injection.source,
        requires,
        status: shouldApply ? 'applied' : 'deferred',
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
        await copyInjection(reconcileTempDir, targetRoot, ref.injection.target, ref.injection.source);
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
