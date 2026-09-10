import path from 'path';
import fs from 'fs-extra';

/**
 * After deleting a file, removes now-empty ancestor directories up to (but never including)
 * `stopAtDir`. Plugins are injected file-by-file rather than as whole directories in several
 * manifests (e.g. storage's `libs/storage/src/contracts/...`), so reverting them one file at a
 * time would otherwise leave empty directory husks behind instead of a clean removal.
 */
export const pruneEmptyParentDirs = async (filePath: string, stopAtDir: string): Promise<void> => {
  const resolvedStop = path.resolve(stopAtDir);
  let dir = path.dirname(path.resolve(filePath));

  while (dir !== resolvedStop && dir.startsWith(resolvedStop + path.sep)) {
    const entries = await fs.readdir(dir).catch(() => null);
    if (entries === null || entries.length > 0) return;
    await fs.rmdir(dir);
    dir = path.dirname(dir);
  }
};
