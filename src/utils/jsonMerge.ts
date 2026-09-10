import { readJsonFile, writeJsonFile } from './json.js';

// Purpose-built JSON mergers for the two known shapes that need cross-plugin merge/removal:
// package.json dependency maps and tsconfig.base.json's compilerOptions.paths aliases.
// Deliberately not a generic recursive deep-merge (see plan) — that would happily do the wrong
// thing to fields like `include`/`exclude` arrays or scalar compiler flags. If a third shape
// ever needs this, write a third purpose-built merger rather than generalizing these two.

export const mergeDependencyRecord = (
  base: Record<string, string> = {},
  toAdd: Record<string, string> = {}
): Record<string, string> => ({ ...base, ...toAdd });

export const subtractDependencyRecord = (
  base: Record<string, string> = {},
  toRemove: Record<string, string> = {},
  stillNeeded: Record<string, string> = {}
): Record<string, string> =>
  Object.fromEntries(Object.entries(base).filter(([key]) => !(key in toRemove) || key in stillNeeded));

export const mergePackageJsonDependencies = async (
  pkgPath: string,
  depsToAdd: Record<string, string>
): Promise<void> => {
  const pkg = await readJsonFile<Record<string, unknown>>(pkgPath);
  if (!pkg) {
    throw new Error(`Cannot merge dependencies — no package.json found at ${pkgPath}`);
  }
  const currentDeps = (pkg['dependencies'] as Record<string, string>) || {};
  await writeJsonFile(pkgPath, { ...pkg, dependencies: mergeDependencyRecord(currentDeps, depsToAdd) });
};

export const removePackageJsonDependencies = async (
  pkgPath: string,
  depsToRemove: Record<string, string>,
  stillNeededDeps: Record<string, string>
): Promise<void> => {
  const pkg = await readJsonFile<Record<string, unknown>>(pkgPath);
  if (!pkg) return;
  const currentDeps = (pkg['dependencies'] as Record<string, string>) || {};
  await writeJsonFile(pkgPath, {
    ...pkg,
    dependencies: subtractDependencyRecord(currentDeps, depsToRemove, stillNeededDeps),
  });
};

interface TsconfigLike {
  compilerOptions?: {
    paths?: Record<string, string[]>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const mergeTsconfigPaths = async (
  tsconfigPath: string,
  pathsToAdd: Record<string, string[]>
): Promise<void> => {
  const tsconfig = await readJsonFile<TsconfigLike>(tsconfigPath);
  if (!tsconfig) {
    throw new Error(`Cannot merge paths — no tsconfig found at ${tsconfigPath}`);
  }
  const compilerOptions = tsconfig.compilerOptions ?? {};
  const currentPaths = compilerOptions.paths ?? {};

  for (const key of Object.keys(pathsToAdd)) {
    if (key in currentPaths && JSON.stringify(currentPaths[key]) !== JSON.stringify(pathsToAdd[key])) {
      throw new Error(
        `tsconfig path alias "${key}" already exists with a different value in ${tsconfigPath} — refusing to overwrite. ` +
          `Existing: ${JSON.stringify(currentPaths[key])}, incoming: ${JSON.stringify(pathsToAdd[key])}`
      );
    }
  }

  await writeJsonFile(tsconfigPath, {
    ...tsconfig,
    compilerOptions: { ...compilerOptions, paths: { ...currentPaths, ...pathsToAdd } },
  });
};

export const removeTsconfigPaths = async (tsconfigPath: string, pathKeysToRemove: string[]): Promise<void> => {
  const tsconfig = await readJsonFile<TsconfigLike>(tsconfigPath);
  if (!tsconfig) return;
  const compilerOptions = tsconfig.compilerOptions ?? {};
  const currentPaths = { ...(compilerOptions.paths ?? {}) };
  for (const key of pathKeysToRemove) delete currentPaths[key];
  await writeJsonFile(tsconfigPath, {
    ...tsconfig,
    compilerOptions: { ...compilerOptions, paths: currentPaths },
  });
};
