import degit from 'degit';
import fs from 'fs-extra';
import path from 'path';

export const fetchTemplate = async (
  source: string,
  destination: string,
  isDev: boolean = false
): Promise<void> => {
  await fs.ensureDir(destination);

  if (isDev) {
    const absoluteSource = path.resolve(process.cwd(), source);
    await fs.copy(absoluteSource, destination, {
      overwrite: true,
      filter: (src) => !src.includes('node_modules') && !src.includes('.git'),
    });
    return;
  }

  const emitter = degit(source, {
    cache: false,
    force: true,
    verbose: true,
  });

  await emitter.clone(destination);
};