import path from 'path';
import fs from 'fs-extra';
import { readJsonFile, writeJsonFile } from './json.js';

export interface LockfileInjectionEntry {
  target: string;
  source: string;
  requires: string | null;
  status: 'applied' | 'deferred';
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
          inj.target === injection.target ? { ...inj, status } : inj
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
