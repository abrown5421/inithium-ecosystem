import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pruneEmptyParentDirs } from './pruneEmptyDirs.js';

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'inithium-prune-'));
});

afterEach(async () => {
  await fs.remove(root);
});

describe('pruneEmptyParentDirs', () => {
  it('removes now-empty ancestor directories up to (not including) the stop dir', async () => {
    const nested = path.join(root, 'libs', 'storage', 'src', 'contracts');
    await fs.ensureDir(nested);
    const filePath = path.join(nested, 'storage-provider.contract.ts');
    await fs.writeFile(filePath, 'x');
    await fs.remove(filePath);

    await pruneEmptyParentDirs(filePath, root);

    expect(await fs.pathExists(path.join(root, 'libs'))).toBe(false);
  });

  it('stops pruning once it hits a directory that still has content', async () => {
    const a = path.join(root, 'libs', 'a');
    const b = path.join(root, 'libs', 'b');
    await fs.ensureDir(a);
    await fs.ensureDir(b);
    const filePath = path.join(a, 'file.ts');
    await fs.writeFile(filePath, 'x');
    await fs.remove(filePath);

    await pruneEmptyParentDirs(filePath, root);

    expect(await fs.pathExists(a)).toBe(false);
    expect(await fs.pathExists(path.join(root, 'libs'))).toBe(true);
    expect(await fs.pathExists(b)).toBe(true);
  });

  it('never removes the stop directory itself, even if empty', async () => {
    const filePath = path.join(root, 'file.ts');
    await fs.writeFile(filePath, 'x');
    await fs.remove(filePath);

    await pruneEmptyParentDirs(filePath, root);

    expect(await fs.pathExists(root)).toBe(true);
  });
});
