import path from 'path';
import fs from 'fs-extra';
import { fetchTemplate } from '../utils/fetcher.js';
import { resolveTemplateSource } from '../utils/paths.js';
import { removePackageJsonPlugin, PluginManifest } from '../utils/json.js';
import { runPackageInstall } from '../utils/installer.js';
import {
  readLockfile,
  writeLockfile,
  findDependents,
  findAppliedBlocksGatedOn,
  removePluginEntry,
  deferAppliedBlocks,
} from '../utils/lockfile.js';

const revertInjection = async (coreRoot: string, targetRoot: string, target: string) => {
  const targetPath = path.join(targetRoot, target);
  const coreEquivalentPath = path.join(coreRoot, target);

  if (await fs.pathExists(coreEquivalentPath)) {
    await fs.copy(coreEquivalentPath, targetPath, { overwrite: true });
  } else {
    await fs.remove(targetPath);
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
      if (injection.status === 'applied') {
        await revertInjection(tempCoreDir, targetRoot, injection.target);
      }
    }

    const gatedBlocks = findAppliedBlocksGatedOn(lockfile, pluginName);
    for (const ref of gatedBlocks) {
      await revertInjection(tempCoreDir, targetRoot, ref.injection.target);
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
    await removePackageJsonPlugin(targetRoot, syntheticManifest);

    lockfile = removePluginEntry(lockfile, pluginName);
    await writeLockfile(targetRoot, lockfile);

    if (!options.skipInstall) {
      await runPackageInstall(targetRoot);
    }
  } finally {
    await fs.remove(tempCoreDir);
  }
};
