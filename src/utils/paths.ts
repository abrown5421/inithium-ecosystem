import fs from 'fs-extra';
import path from 'path';

const CLI_PACKAGE_NAME = '@inithium/cli';

export const getPackageRoot = (startDir: string = __dirname): string => {
  let currentDir = startDir;

  while (true) {
    const candidatePkgPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(candidatePkgPath)) {
      const pkg = fs.readJsonSync(candidatePkgPath);
      if (pkg?.name === CLI_PACKAGE_NAME) {
        return currentDir;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      throw new Error(`Unable to locate ${CLI_PACKAGE_NAME} package root from ${startDir}`);
    }
    currentDir = parentDir;
  }
};

export const resolveTemplateSource = (isDev: boolean = false): string => {
  if (isDev) {
    return path.join(getPackageRoot(), 'templates', 'core');
  }
  return 'github:abrown5421/inithium-ecosystem/templates/core';
};

export const resolvePluginSource = (pluginName: string, isDev: boolean = false): string => {
  if (isDev) {
    return path.join(getPackageRoot(), 'templates', 'plugins', pluginName);
  }
  return `github:abrown5421/inithium-ecosystem/templates/plugins/${pluginName}`;
};
