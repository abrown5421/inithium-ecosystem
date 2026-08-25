import path from 'path';
import { fetchTemplate } from '../utils/fetcher.js';
import { runPackageInstall } from '../utils/installer.js';

export const resolveTemplateSource = (isDev: boolean = false): string => {
  if (isDev) {
    return './templates/core';
  }
  return 'github:abrown5421/inithium-ecosystem/templates/core';
};

export const initCommand = async (
  projectName: string,
  options: { dev?: boolean; skipInstall?: boolean }
): Promise<void> => {
  const targetDestination = path.resolve(process.cwd(), projectName);
  const isDev = Boolean(options.dev);
  const source = resolveTemplateSource(isDev);

  await fetchTemplate(source, targetDestination, isDev);

  if (!options.skipInstall) {
    await runPackageInstall(targetDestination);
  }
};