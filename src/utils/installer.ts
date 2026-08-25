import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export type PackageManager = 'pnpm' | 'yarn' | 'npm';

export const detectPackageManager = async (targetPath: string): Promise<PackageManager> => {
  if (await fs.pathExists(path.join(targetPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(targetPath, 'yarn.lock'))) return 'yarn';
  return 'npm';
};

export const runPackageInstall = async (
  targetPath: string,
  pm?: PackageManager
): Promise<void> => {
  const activePm = pm || (await detectPackageManager(targetPath));
  
  await execa(activePm, ['install'], {
    cwd: targetPath,
    stdio: 'inherit',
  });
};