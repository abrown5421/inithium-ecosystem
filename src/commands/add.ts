import path from 'path';
import fs from 'fs-extra';
import { fetchTemplate } from '../utils/fetcher.js';
import { readJsonFile, updatePackageJsonWithPlugin, PluginManifest } from '../utils/json.js';
import { runPackageInstall } from '../utils/installer.js';

export const resolvePluginSource = (pluginName: string, isDev: boolean = false): string => {
  if (isDev) {
    return `./templates/plugins/${pluginName}`;
  }
  return `github:abrown5421/inithium-ecosystem/templates/plugins/${pluginName}`;
};

export const addCommand = async (
  pluginName: string,
  options: { dev?: boolean; skipInstall?: boolean }
): Promise<void> => {
  const targetRoot = process.cwd();
  const isDev = Boolean(options.dev);
  const pluginSource = resolvePluginSource(pluginName, isDev);
  
  const tempPluginDir = path.join(targetRoot, `.inithium-temp-${pluginName}`);

  try {
    await fetchTemplate(pluginSource, tempPluginDir, isDev);

    const manifestPath = path.join(tempPluginDir, 'manifest.json');
    const manifest = await readJsonFile<PluginManifest>(manifestPath);

    if (!manifest) {
      throw new Error(`Invalid plugin: manifest.json missing in ${pluginName}`);
    }

    if (manifest.injections) {
      for (const injection of manifest.injections) {
        const srcPath = path.join(tempPluginDir, injection.source);
        const destPath = path.join(targetRoot, injection.target);

        if (await fs.pathExists(srcPath)) {
          await fs.copy(srcPath, destPath, { overwrite: true });
        }
      }
    }

    await updatePackageJsonWithPlugin(targetRoot, manifest);

    if (!options.skipInstall) {
      await runPackageInstall(targetRoot);
    }
  } finally {
    await fs.remove(tempPluginDir);
  }
};