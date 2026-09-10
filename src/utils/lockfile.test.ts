import { describe, expect, it } from 'vitest';
import {
  applyDeferredBlocks,
  deferAppliedBlocks,
  findAppliedBlocksGatedOn,
  findAppliedInjectionsForTarget,
  findOtherAppliedEntryForTarget,
  Lockfile,
} from './lockfile.js';

// Regression test for the confirmed bug: blog ships two injection entries for the exact same
// target (BlogPostEditDialog.tsx) — a plain variant and a `requires:"storage"` variant.
// Removing "storage" must defer/revert only the storage-gated entry, not both.
const buildLockfileWithTwoVariantsOfOneTarget = (): Lockfile => ({
  version: 1,
  plugins: {
    blog: {
      version: '1.0.0',
      installedAt: '2026-01-01T00:00:00.000Z',
      dependencies: [],
      npmDependencies: {},
      injections: [
        {
          target: 'libs/cms/src/modules/blog/BlogPostEditDialog.tsx',
          source: 'src/cms/modules/blog/BlogPostEditDialog.tsx',
          requires: null,
          status: 'applied',
          strategy: 'overwrite',
        },
        {
          target: 'libs/cms/src/modules/blog/BlogPostEditDialog.tsx',
          source: 'src/cms/modules/blog/BlogPostEditDialog.storage.tsx',
          requires: 'storage',
          status: 'applied',
          strategy: 'overwrite',
        },
      ],
    },
    storage: {
      version: '1.0.0',
      installedAt: '2026-01-01T00:00:00.000Z',
      dependencies: [],
      npmDependencies: {},
      injections: [],
    },
  },
});

describe('same-target, different-source injection identity', () => {
  it('findAppliedBlocksGatedOn only returns the storage-gated variant, not the plain one', () => {
    const lockfile = buildLockfileWithTwoVariantsOfOneTarget();
    const gated = findAppliedBlocksGatedOn(lockfile, 'storage');
    expect(gated).toHaveLength(1);
    expect(gated[0].injection.source).toBe('src/cms/modules/blog/BlogPostEditDialog.storage.tsx');
  });

  it('deferAppliedBlocks flips only the gated entry, leaving the plain variant applied', () => {
    const lockfile = buildLockfileWithTwoVariantsOfOneTarget();
    const gated = findAppliedBlocksGatedOn(lockfile, 'storage');
    const updated = deferAppliedBlocks(lockfile, gated);

    const [plain, storageVariant] = updated.plugins.blog.injections;
    expect(plain.status).toBe('applied');
    expect(storageVariant.status).toBe('deferred');
  });

  it('applyDeferredBlocks then reverses it correctly, without touching the plain variant', () => {
    const lockfile = buildLockfileWithTwoVariantsOfOneTarget();
    const gated = findAppliedBlocksGatedOn(lockfile, 'storage');
    const deferred = deferAppliedBlocks(lockfile, gated);
    const reapplied = applyDeferredBlocks(deferred, gated);

    const [plain, storageVariant] = reapplied.plugins.blog.injections;
    expect(plain.status).toBe('applied');
    expect(storageVariant.status).toBe('applied');
  });

  it('findOtherAppliedEntryForTarget finds the plain variant once the gated one is excluded', () => {
    const lockfile = buildLockfileWithTwoVariantsOfOneTarget();
    const other = findOtherAppliedEntryForTarget(lockfile, 'libs/cms/src/modules/blog/BlogPostEditDialog.tsx', {
      plugin: 'blog',
      source: 'src/cms/modules/blog/BlogPostEditDialog.storage.tsx',
    });
    expect(other?.injection.source).toBe('src/cms/modules/blog/BlogPostEditDialog.tsx');
  });
});

describe('findAppliedInjectionsForTarget (json-merge reference counting)', () => {
  it('returns every other applied injection at the same target across plugins', () => {
    const lockfile: Lockfile = {
      version: 1,
      plugins: {
        gallery: {
          version: '1.0.0',
          installedAt: '2026-01-01T00:00:00.000Z',
          dependencies: [],
          npmDependencies: {},
          injections: [
            {
              target: 'package.json',
              source: 'package.deps.json',
              requires: null,
              status: 'applied',
              strategy: 'package-json-merge',
              jsonDependencies: { multer: '^2.0.0' },
            },
          ],
        },
        storage: {
          version: '1.0.0',
          installedAt: '2026-01-01T00:00:00.000Z',
          dependencies: [],
          npmDependencies: {},
          injections: [
            {
              target: 'package.json',
              source: 'package.deps.json',
              requires: null,
              status: 'applied',
              strategy: 'package-json-merge',
              jsonDependencies: { multer: '^2.0.0' },
            },
          ],
        },
      },
    };

    const others = findAppliedInjectionsForTarget(lockfile, 'package.json', {
      plugin: 'storage',
      source: 'package.deps.json',
    });
    expect(others).toHaveLength(1);
    expect(others[0].plugin).toBe('gallery');
    expect(others[0].injection.jsonDependencies).toEqual({ multer: '^2.0.0' });
  });
});
