import path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';

/**
 * Writes to a temp file in the same directory and renames it into place, rather than
 * streaming over the real file directly. A crash or full disk mid-write leaves the temp file
 * orphaned and the real target untouched, instead of leaving a truncated/corrupted target with
 * no marker for a retry to clean up.
 */
export const writeFileAtomic = async (filePath: string, content: string): Promise<void> => {
  const dir = path.dirname(filePath);
  await fs.ensureDir(dir);
  const tempPath = path.join(dir, `.inithium-tmp-${crypto.randomBytes(6).toString('hex')}`);
  await fs.writeFile(tempPath, content, 'utf8');
  await fs.rename(tempPath, filePath);
};
