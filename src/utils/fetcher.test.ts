import path from 'path';
import { describe, expect, it } from 'vitest';
import { shouldCopyDevTemplatePath } from './fetcher.js';

const p = (...segments: string[]) => path.join(...segments);

describe('shouldCopyDevTemplatePath', () => {
  it('excludes build/vcs/cache directories', () => {
    expect(shouldCopyDevTemplatePath(p('templates', 'core', 'node_modules'))).toBe(false);
    expect(shouldCopyDevTemplatePath(p('templates', 'core', '.git'))).toBe(false);
    expect(shouldCopyDevTemplatePath(p('templates', 'core', '.nx'))).toBe(false);
    expect(shouldCopyDevTemplatePath(p('templates', 'core', 'dist'))).toBe(false);
    expect(shouldCopyDevTemplatePath(p('templates', 'core', 'tmp'))).toBe(false);
  });

  it('does not exclude files that merely start with an excluded name (the confirmed regression)', () => {
    expect(shouldCopyDevTemplatePath(p('templates', 'core', '.gitignore'))).toBe(true);
    expect(shouldCopyDevTemplatePath(p('templates', 'core', 'apps', 'web', 'src', 'assets', '.gitkeep'))).toBe(true);
  });

  it('excludes a real .env but keeps .env.example', () => {
    expect(shouldCopyDevTemplatePath(p('templates', 'core', '.env'))).toBe(false);
    expect(shouldCopyDevTemplatePath(p('templates', 'core', '.env.local'))).toBe(false);
    expect(shouldCopyDevTemplatePath(p('templates', 'core', '.env.example'))).toBe(true);
  });

  it('allows ordinary source files through', () => {
    expect(shouldCopyDevTemplatePath(p('templates', 'core', 'libs', 'db', 'src', 'index.ts'))).toBe(true);
    expect(shouldCopyDevTemplatePath(p('templates', 'core', 'package.json'))).toBe(true);
  });
});
