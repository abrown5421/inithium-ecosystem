import { describe, expect, it } from 'vitest';
import {
  applyMergeFragment,
  insertAtAnchor,
  matchAnchorLine,
  matchBlockMarker,
  parseFragmentSections,
  removePluginBlocks,
  revertMergeFragment,
  validateAnchorsPresent,
} from './anchors.js';

describe('matchAnchorLine / matchBlockMarker', () => {
  it('matches a bare anchor comment, trimmed', () => {
    expect(matchAnchorLine('// inithium:anchor:imports')).toBe('imports');
    expect(matchAnchorLine('   // inithium:anchor:imports   ')).toBe('imports');
  });

  it('matches the JSX-comment anchor form', () => {
    expect(matchAnchorLine('{/* inithium:anchor:route-branches */}')).toBe('route-branches');
  });

  it('does not match a substring occurrence inside other code', () => {
    expect(matchAnchorLine(`console.log("// inithium:anchor:imports")`)).toBeNull();
    expect(matchAnchorLine('// this is not an anchor')).toBeNull();
  });

  it('matches start/end block markers and rejects the wrong kind', () => {
    expect(matchBlockMarker('// inithium:block:blog:imports:start', 'start')).toEqual({
      plugin: 'blog',
      anchorId: 'imports',
    });
    expect(matchBlockMarker('// inithium:block:blog:imports:end', 'end')).toEqual({
      plugin: 'blog',
      anchorId: 'imports',
    });
    expect(matchBlockMarker('// inithium:block:blog:imports:start', 'end')).toBeNull();
  });
});

describe('parseFragmentSections', () => {
  it('slices a fragment into per-anchor segments', () => {
    const fragment = [
      "import { getBlogRepository } from './blog';",
      '// inithium:anchor:imports',
      'export const listBlogPosts = () => {};',
      '// inithium:anchor:repositories',
    ].join('\n');

    const sections = parseFragmentSections(fragment);
    expect(sections).toEqual([
      { anchorId: 'imports', content: "import { getBlogRepository } from './blog';" },
      { anchorId: 'repositories', content: 'export const listBlogPosts = () => {};' },
    ]);
  });

  it('throws when content trails the last anchor with nowhere to go', () => {
    const fragment = ['// inithium:anchor:imports', 'export const orphaned = 1;'].join('\n');
    expect(() => parseFragmentSections(fragment)).toThrow(/nowhere to attach/);
  });

  it('returns an empty content segment when two anchors are adjacent', () => {
    const fragment = ['// inithium:anchor:imports', '// inithium:anchor:repositories'].join('\n');
    expect(parseFragmentSections(fragment)).toEqual([
      { anchorId: 'imports', content: '' },
      { anchorId: 'repositories', content: '' },
    ]);
  });
});

describe('validateAnchorsPresent', () => {
  const target = ['const a = 1;', '// inithium:anchor:imports', 'const b = 2;'].join('\n');

  it('passes when every requested anchor exists exactly once', () => {
    expect(validateAnchorsPresent(target, ['imports'], 'file.ts')).toEqual([]);
  });

  it('flags a missing anchor', () => {
    const issues = validateAnchorsPresent(target, ['repositories'], 'file.ts');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/not found/);
  });

  it('flags a duplicated anchor', () => {
    const duped = ['// inithium:anchor:imports', '// inithium:anchor:imports'].join('\n');
    const issues = validateAnchorsPresent(duped, ['imports'], 'file.ts');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/appears 2 times/);
  });

  it('flags an unterminated block marker', () => {
    const broken = ['// inithium:block:blog:imports:start', 'const x = 1;'].join('\n');
    const issues = validateAnchorsPresent(broken, [], 'file.ts');
    expect(issues.some((i) => i.message.includes('Unterminated'))).toBe(true);
  });

  it('flags a mismatched end marker', () => {
    const broken = [
      '// inithium:block:blog:imports:start',
      '// inithium:block:gallery:imports:end',
    ].join('\n');
    const issues = validateAnchorsPresent(broken, [], 'file.ts');
    expect(issues.some((i) => i.message.includes('Mismatched'))).toBe(true);
  });
});

describe('insertAtAnchor', () => {
  it('inserts a wrapped block immediately before the anchor line', () => {
    const target = ['const a = 1;', '// inithium:anchor:body', 'const z = 99;'].join('\n');
    const result = insertAtAnchor(target, 'body', 'blog', 'const b = 2;');
    expect(result.split('\n')).toEqual([
      'const a = 1;',
      '// inithium:block:blog:body:start',
      'const b = 2;',
      '// inithium:block:blog:body:end',
      '// inithium:anchor:body',
      'const z = 99;',
    ]);
  });

  it('stacks a second plugin block after the first, both before the anchor', () => {
    const target = ['// inithium:anchor:body'].join('\n');
    const afterBlog = insertAtAnchor(target, 'body', 'blog', 'const blog = 1;');
    const afterGallery = insertAtAnchor(afterBlog, 'body', 'gallery', 'const gallery = 1;');
    expect(afterGallery.split('\n')).toEqual([
      '// inithium:block:blog:body:start',
      'const blog = 1;',
      '// inithium:block:blog:body:end',
      '// inithium:block:gallery:body:start',
      'const gallery = 1;',
      '// inithium:block:gallery:body:end',
      '// inithium:anchor:body',
    ]);
  });

  it('is idempotent: re-inserting the same plugin/anchor replaces rather than duplicates', () => {
    const target = ['// inithium:anchor:body'].join('\n');
    const once = insertAtAnchor(target, 'body', 'blog', 'const v1 = 1;');
    const twice = insertAtAnchor(once, 'body', 'blog', 'const v2 = 2;');
    expect(twice.split('\n')).toEqual([
      '// inithium:block:blog:body:start',
      'const v2 = 2;',
      '// inithium:block:blog:body:end',
      '// inithium:anchor:body',
    ]);
  });

  it('does not disturb another plugin already sitting at the same anchor when re-run', () => {
    const target = ['// inithium:anchor:body'].join('\n');
    const withGallery = insertAtAnchor(target, 'body', 'gallery', 'const gallery = 1;');
    const withBlogAdded = insertAtAnchor(withGallery, 'body', 'blog', 'const blog = 1;');
    const blogReinserted = insertAtAnchor(withBlogAdded, 'body', 'blog', 'const blog = 2;');
    expect(blogReinserted).toContain('const gallery = 1;');
    expect(blogReinserted).toContain('const blog = 2;');
    expect(blogReinserted).not.toContain('const blog = 1;');
  });

  it('throws when the anchor is missing', () => {
    expect(() => insertAtAnchor('const a = 1;', 'body', 'blog', 'const b = 2;')).toThrow(/not found/);
  });

  it('throws when the anchor appears more than once', () => {
    const target = ['// inithium:anchor:body', '// inithium:anchor:body'].join('\n');
    expect(() => insertAtAnchor(target, 'body', 'blog', 'const b = 2;')).toThrow(/expected exactly once/);
  });
});

describe('applyMergeFragment / revertMergeFragment (full add/remove round trip)', () => {
  const target = [
    "import { DbProvider } from './contract';",
    '// inithium:anchor:imports',
    '',
    'export interface DbProvider {',
    '  getUserRepository(): UserRepository;',
    '  // inithium:anchor:members',
    '}',
  ].join('\n');

  const blogFragment = [
    "import { BlogRepository } from './blog.contract';",
    '// inithium:anchor:imports',
    '  getBlogRepository(): BlogRepository;',
    '// inithium:anchor:members',
  ].join('\n');

  const galleryFragment = [
    "import { GalleryRepository } from './gallery.contract';",
    '// inithium:anchor:imports',
    '  getGalleryRepository(): GalleryRepository;',
    '// inithium:anchor:members',
  ].join('\n');

  it('merges two plugins into distinct anchors without disturbing each other', () => {
    const withBlog = applyMergeFragment(target, blogFragment, 'blog');
    const withBoth = applyMergeFragment(withBlog, galleryFragment, 'gallery');

    expect(withBoth).toContain('getUserRepository(): UserRepository;');
    expect(withBoth).toContain('getBlogRepository(): BlogRepository;');
    expect(withBoth).toContain('getGalleryRepository(): GalleryRepository;');
    expect(withBoth).toContain("import { BlogRepository } from './blog.contract';");
    expect(withBoth).toContain("import { GalleryRepository } from './gallery.contract';");
  });

  it('removing one plugin strips only its own contribution, at every anchor it touched', () => {
    const withBlog = applyMergeFragment(target, blogFragment, 'blog');
    const withBoth = applyMergeFragment(withBlog, galleryFragment, 'gallery');

    const galleryRemoved = revertMergeFragment(withBoth, 'gallery');
    expect(galleryRemoved).toContain('getBlogRepository(): BlogRepository;');
    expect(galleryRemoved).not.toContain('getGalleryRepository');
    expect(galleryRemoved).not.toContain("GalleryRepository } from './gallery.contract'");

    const bothRemoved = revertMergeFragment(galleryRemoved, 'blog');
    expect(bothRemoved).not.toContain('getBlogRepository');
    expect(bothRemoved.trim()).toBe(target.trim());
  });

  it('removing a plugin never installed is a harmless no-op', () => {
    const withBlog = applyMergeFragment(target, blogFragment, 'blog');
    expect(revertMergeFragment(withBlog, 'contact')).toBe(withBlog);
  });
});

describe('line-ending preservation', () => {
  it('preserves CRLF through an insert', () => {
    const target = ['const a = 1;', '// inithium:anchor:body'].join('\r\n');
    const result = insertAtAnchor(target, 'body', 'blog', 'const b = 2;');
    expect(result.split('\r\n')).toEqual([
      'const a = 1;',
      '// inithium:block:blog:body:start',
      'const b = 2;',
      '// inithium:block:blog:body:end',
      '// inithium:anchor:body',
    ]);
  });

  it('preserves CRLF through a revert', () => {
    const target = ['// inithium:anchor:body'].join('\r\n');
    const withBlock = insertAtAnchor(target, 'body', 'blog', 'const b = 2;');
    const reverted = revertMergeFragment(withBlock, 'blog');
    expect(reverted).toBe('// inithium:anchor:body');
    expect(reverted).not.toContain('\r\n\r\n');
  });

  it('keeps plain LF files on LF', () => {
    const target = ['const a = 1;', '// inithium:anchor:body'].join('\n');
    const result = insertAtAnchor(target, 'body', 'blog', 'const b = 2;');
    expect(result.includes('\r\n')).toBe(false);
  });
});

describe('removePluginBlocks anchor scoping', () => {
  it('with an anchorId, only removes that plugin/anchor pair, leaving its other anchors intact', () => {
    const content = [
      '// inithium:block:blog:imports:start',
      "import x from 'x';",
      '// inithium:block:blog:imports:end',
      '// inithium:block:blog:members:start',
      'member();',
      '// inithium:block:blog:members:end',
    ].join('\n');

    const result = removePluginBlocks(content, 'blog', 'imports');
    expect(result).not.toContain("import x from 'x';");
    expect(result).toContain('member();');
  });
});
