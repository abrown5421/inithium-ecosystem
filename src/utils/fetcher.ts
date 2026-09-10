import degit from 'degit';
import fs from 'fs-extra';
import path from 'path';

// Matched against a path segment's exact basename, never a substring - a naive `path.includes('.git')`
// check would also reject `.gitignore`/`.gitkeep` (both legitimately start with ".git"), which is
// a real bug this repo shipped with: every `--dev`-scaffolded project silently had no .gitignore.
const EXCLUDED_DIR_NAMES = new Set(['node_modules', '.git', '.nx', 'dist', 'tmp']);

export const shouldCopyDevTemplatePath = (src: string): boolean => {
  const base = path.basename(src);
  if (EXCLUDED_DIR_NAMES.has(base)) return false;
  // Never copy a maintainer's real local secrets into a scaffolded workspace - only the
  // committed `.env.example` template should ever travel with `--dev` local testing.
  if (base.startsWith('.env') && base !== '.env.example') return false;
  return true;
};

export const fetchTemplate = async (
  source: string,
  destination: string,
  isDev: boolean = false
): Promise<void> => {
  await fs.ensureDir(destination);

  if (isDev) {
    const absoluteSource = path.resolve(source);
    await fs.copy(absoluteSource, destination, {
      overwrite: true,
      filter: shouldCopyDevTemplatePath,
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