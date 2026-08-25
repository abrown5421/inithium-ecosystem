import path from 'path';
import fs from 'fs-extra';
import { fetchTemplate } from '../utils/fetcher.js';
import { resolvePluginSource, resolveTemplateSource } from '../utils/paths.js';
import { readJsonFile, removePackageJsonPlugin, PluginManifest } from '../utils/json.js';
import { runPackageInstall } from '../utils/installer.js';

export const removeCommand = async (
  pluginName: string,
  options: { dev?: boolean; skipInstall?: boolean }
): Promise<void> => {
  const targetRoot = process.cwd();
  const isDev = Boolean(options.dev);
  const pluginSource = resolvePluginSource(pluginName, isDev);
  const coreSource = resolveTemplateSource(isDev);

  const tempPluginDir = path.join(targetRoot, `.inithium-temp-${pluginName}`);
  const tempCoreDir = path.join(targetRoot, `.inithium-temp-core`);

  try {
    await fetchTemplate(pluginSource, tempPluginDir, isDev);
    await fetchTemplate(coreSource, tempCoreDir, isDev);

    const manifestPath = path.join(tempPluginDir, 'manifest.json');
    const manifest = await readJsonFile<PluginManifest>(manifestPath);

    if (!manifest) {
      throw new Error(`Invalid plugin: manifest.json missing in ${pluginName}`);
    }

    if (manifest.injections) {
      for (const injection of manifest.injections) {
        const targetPath = path.join(targetRoot, injection.target);
        const coreEquivalentPath = path.join(tempCoreDir, injection.target);

        if (await fs.pathExists(coreEquivalentPath)) {
          await fs.copy(coreEquivalentPath, targetPath, { overwrite: true });
        } else {
          await fs.remove(targetPath);
        }
      }
    }

    await removePackageJsonPlugin(targetRoot, manifest);

    if (!options.skipInstall) {
      await runPackageInstall(targetRoot);
    }
  } finally {
    await fs.remove(tempPluginDir);
    await fs.remove(tempCoreDir);
  }
};
