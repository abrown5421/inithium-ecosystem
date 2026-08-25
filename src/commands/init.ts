import path from 'path';
import { fetchTemplate } from '../utils/fetcher.js';
import { runPackageInstall } from '../utils/installer.js';
import { resolveTemplateSource } from '../utils/paths.js';

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