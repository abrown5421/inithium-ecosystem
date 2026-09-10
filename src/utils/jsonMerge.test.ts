import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mergePackageJsonDependencies,
  mergeTsconfigPaths,
  removePackageJsonDependencies,
  removeTsconfigPaths,
  subtractDependencyRecord,
} from './jsonMerge.js';
import { readJsonFile } from './json.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inithium-jsonmerge-'));
});

afterEach(async () => {
  await fs.remove(tempDir);
});

describe('subtractDependencyRecord (reference counting)', () => {
  it('keeps a dependency another plugin still needs', () => {
    const result = subtractDependencyRecord(
      { multer: '^2.0.0', recharts: '^2.15.0' },
      { multer: '^2.0.0' },
      { multer: '^2.0.0' } // gallery still needs it even though storage is being removed
    );
    expect(result).toEqual({ multer: '^2.0.0', recharts: '^2.15.0' });
  });

  it('removes a dependency nothing else needs', () => {
    const result = subtractDependencyRecord({ multer: '^2.0.0', recharts: '^2.15.0' }, { multer: '^2.0.0' }, {});
    expect(result).toEqual({ recharts: '^2.15.0' });
  });
});

describe('package.json dependency merge round trip', () => {
  it('merges then removes cleanly, respecting still-needed deps', async () => {
    const pkgPath = path.join(tempDir, 'package.json');
    await fs.writeJson(pkgPath, { name: 'x', dependencies: { react: '^19.0.0' } });

    await mergePackageJsonDependencies(pkgPath, { multer: '^2.0.0' });
    let pkg = await readJsonFile<{ dependencies: Record<string, string> }>(pkgPath);
    expect(pkg?.dependencies).toEqual({ react: '^19.0.0', multer: '^2.0.0' });

    // simulate storage being removed while gallery (still installed) also needs multer
    await removePackageJsonDependencies(pkgPath, { multer: '^2.0.0' }, { multer: '^2.0.0' });
    pkg = await readJsonFile<{ dependencies: Record<string, string> }>(pkgPath);
    expect(pkg?.dependencies).toEqual({ react: '^19.0.0', multer: '^2.0.0' });

    // now simulate gallery being removed too - nothing needs it any more
    await removePackageJsonDependencies(pkgPath, { multer: '^2.0.0' }, {});
    pkg = await readJsonFile<{ dependencies: Record<string, string> }>(pkgPath);
    expect(pkg?.dependencies).toEqual({ react: '^19.0.0' });
  });
});

describe('tsconfig.base.json paths merge', () => {
  it('adds a new alias cleanly', async () => {
    const tsconfigPath = path.join(tempDir, 'tsconfig.base.json');
    await fs.writeJson(tsconfigPath, { compilerOptions: { paths: { '@inithium/db': ['./libs/db/src/index.ts'] } } });

    await mergeTsconfigPaths(tsconfigPath, { '@inithium/storage': ['./libs/storage/src/index.ts'] });
    const tsconfig = await readJsonFile<{ compilerOptions: { paths: Record<string, string[]> } }>(tsconfigPath);
    expect(tsconfig?.compilerOptions.paths).toEqual({
      '@inithium/db': ['./libs/db/src/index.ts'],
      '@inithium/storage': ['./libs/storage/src/index.ts'],
    });
  });

  it('errors if two plugins try to define the same alias with different values', async () => {
    const tsconfigPath = path.join(tempDir, 'tsconfig.base.json');
    await fs.writeJson(tsconfigPath, { compilerOptions: { paths: { '@inithium/db': ['./libs/db/src/index.ts'] } } });

    await expect(mergeTsconfigPaths(tsconfigPath, { '@inithium/db': ['./libs/db-alt/src/index.ts'] })).rejects.toThrow(
      /already exists with a different value/
    );
  });

  it('allows re-adding the identical alias (idempotent)', async () => {
    const tsconfigPath = path.join(tempDir, 'tsconfig.base.json');
    await fs.writeJson(tsconfigPath, { compilerOptions: { paths: { '@inithium/db': ['./libs/db/src/index.ts'] } } });
    await expect(mergeTsconfigPaths(tsconfigPath, { '@inithium/db': ['./libs/db/src/index.ts'] })).resolves.not.toThrow();
  });

  it('removes only the requested keys', async () => {
    const tsconfigPath = path.join(tempDir, 'tsconfig.base.json');
    await fs.writeJson(tsconfigPath, {
      compilerOptions: {
        paths: { '@inithium/db': ['./libs/db/src/index.ts'], '@inithium/storage': ['./libs/storage/src/index.ts'] },
      },
    });

    await removeTsconfigPaths(tsconfigPath, ['@inithium/storage']);
    const tsconfig = await readJsonFile<{ compilerOptions: { paths: Record<string, string[]> } }>(tsconfigPath);
    expect(tsconfig?.compilerOptions.paths).toEqual({ '@inithium/db': ['./libs/db/src/index.ts'] });
  });
});
