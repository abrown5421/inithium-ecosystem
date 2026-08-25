import fs from 'fs-extra';
import path from 'path';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  dependencies?: {
    npm?: Record<string, string>;
    plugins?: string[];
  };
  injections?: Array<{
    target: string;
    source: string;
  }>;
}

export const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    const exists = await fs.pathExists(filePath);
    if (!exists) return null;
    return (await fs.readJson(filePath)) as T;
  } catch {
    return null;
  }
};

export const writeJsonFile = async <T>(filePath: string, data: T): Promise<void> => {
  await fs.writeJson(filePath, data, { spaces: 2 });
};

export const mergePackageDependencies = (
  targetDeps: Record<string, string> = {},
  sourceDeps: Record<string, string> = {}
): Record<string, string> => ({
  ...targetDeps,
  ...sourceDeps,
});

export const updatePackageJsonWithPlugin = async (
  targetProjectRoot: string,
  pluginManifest: PluginManifest
): Promise<void> => {
  const pkgPath = path.join(targetProjectRoot, 'package.json');
  const existingPkg = await readJsonFile<Record<string, unknown>>(pkgPath);

  if (!existingPkg) return;

  const currentDeps = (existingPkg['dependencies'] as Record<string, string>) || {};
  const newDeps = pluginManifest.dependencies?.npm || {};

  const updatedPkg = {
    ...existingPkg,
    dependencies: mergePackageDependencies(currentDeps, newDeps),
  };

  await writeJsonFile(pkgPath, updatedPkg);
};

export const removePackageDependencies = (
  targetDeps: Record<string, string> = {},
  depsToRemove: Record<string, string> = {}
): Record<string, string> =>
  Object.fromEntries(Object.entries(targetDeps).filter(([key]) => !(key in depsToRemove)));

export const removePackageJsonPlugin = async (
  targetProjectRoot: string,
  pluginManifest: PluginManifest
): Promise<void> => {
  const pkgPath = path.join(targetProjectRoot, 'package.json');
  const existingPkg = await readJsonFile<Record<string, unknown>>(pkgPath);

  if (!existingPkg) return;

  const currentDeps = (existingPkg['dependencies'] as Record<string, string>) || {};
  const depsToRemove = pluginManifest.dependencies?.npm || {};

  const updatedPkg = {
    ...existingPkg,
    dependencies: removePackageDependencies(currentDeps, depsToRemove),
  };

  await writeJsonFile(pkgPath, updatedPkg);
};