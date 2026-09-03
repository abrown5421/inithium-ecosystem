import { useEffect, useMemo, useState } from 'react';
import {
  Banner,
  Box,
  Card,
  Divider,
  Input,
  Loader,
  Pagination,
  Pill,
  Select,
  SelectItem,
  Text,
  useElementSize,
  useNavigateWithTransition,
} from '@inithium/ui';
import { useListBlogAuthorsQuery, useListBlogCategoriesQuery, useListBlogPostsQuery } from '@inithium/api-client';
import type { BlogPostEntity } from '@inithium/api-client';
import { generateBlogBannerConfig } from './blogBannerConfig';

const PAGE_SIZE = 12;
const CARD_BANNER_HEIGHT = 160;
const SEARCH_DEBOUNCE_MS = 300;

// Radix Select disallows an empty-string item value, so "no filter" needs a sentinel rather
// than a blank option - translated back to `undefined` before it ever reaches the query.
const ALL_CATEGORIES = '__all_categories__';
const ALL_AUTHORS = '__all_authors__';

interface BlogPostCardProps {
  readonly post: BlogPostEntity;
  readonly onClick: () => void;
}

// Its own component (not inlined in the .map() below) so the per-post banner config can be
// memoized by post id via a normal top-level useMemo - hooks can't be called conditionally or
// per-iteration inside a .map() callback, and recomputing every card's mesh (each a handful of
// resolveComputedColorHex canvas round-trips) on every keystroke in the title search would
// otherwise re-run for all 12 cards on every parent re-render.
const BlogPostCard = ({ post, onClick }: BlogPostCardProps) => {
  const bannerConfig = useMemo(() => generateBlogBannerConfig(post.id), [post.id]);
  // Banner generates its mesh against a fixed reference width whenever it isn't told a real
  // pixel width, then stretches that mesh to fill however wide it actually renders - fine near
  // that reference width, but visibly over/under-densifies the triangles at the extremes (a
  // ~300px card grid cell chief among them - see Banner.tsx's own comment and its documented
  // useElementSize pattern). Measuring this card's own wrapper keeps every card's mesh
  // proportional regardless of the grid's current column count.
  const { ref: bannerSizeRef, size: bannerSize } = useElementSize();

  return (
    <Card
      onClick={onClick}
      media={
        <div ref={bannerSizeRef} className="relative">
          <Banner imageUrl={post.image} trianglifyConfig={bannerConfig} width={bannerSize?.width} height={CARD_BANNER_HEIGHT} />
          <Pill className="absolute right-3 top-3">{post.category}</Pill>
        </div>
      }
    >
      <Box flex={{ direction: 'col', gap: 8 }}>
        <Text as="h3" className="text-lg font-semibold">
          {post.title}
        </Text>
        <Text as="p" className="line-clamp-3 min-h-16 text-sm text-surface-600">
          {post.excerpt}
        </Text>
        <Divider margin={{ top: 4, bottom: 4 }} />
        <Box flex={{ direction: 'row', justify: 'between' }}>
          <Text className="text-xs text-surface-600">{post.authorName}</Text>
          <Text className="text-xs text-surface-600">{new Date(post.createdAt).toLocaleDateString()}</Text>
        </Box>
      </Box>
    </Card>
  );
};

export const BlogIndexPage = () => {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [author, setAuthor] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [debouncedTitle, setDebouncedTitle] = useState('');
  const navigate = useNavigateWithTransition();

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedTitle(titleInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [titleInput]);

  useEffect(() => {
    setPage(1);
  }, [category, author, debouncedTitle]);

  const { data: categories } = useListBlogCategoriesQuery();
  const { data: authors } = useListBlogAuthorsQuery();
  const { data, isLoading } = useListBlogPostsQuery({
    page,
    pageSize: PAGE_SIZE,
    category: category || undefined,
    author: author || undefined,
    search: debouncedTitle || undefined,
    searchField: debouncedTitle ? 'title' : undefined,
  });

  return (
    <Box flex={{ direction: 'col', gap: 24 }} padding={{ base: 32 }}>
      <Text as="h1" className="text-3xl font-bold">
        Blog
      </Text>

      <Box flex={{ direction: 'row', gap: 12 }}>
        <Select
          value={category || ALL_CATEGORIES}
          onValueChange={(value) => setCategory(value === ALL_CATEGORIES ? '' : value)}
          className="flex-1"
        >
          <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
          {(categories ?? []).map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </Select>
        <Select
          value={author || ALL_AUTHORS}
          onValueChange={(value) => setAuthor(value === ALL_AUTHORS ? '' : value)}
          className="flex-1"
        >
          <SelectItem value={ALL_AUTHORS}>All Authors</SelectItem>
          {(authors ?? []).map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </Select>
        <Input
          placeholder="Search by title..."
          value={titleInput}
          onChange={(event) => setTitleInput(event.target.value)}
          className="flex-1"
        />
      </Box>

      {isLoading ? (
        <Box flex={{ justify: 'center' }} padding={{ base: 32 }}>
          <Loader variant="spinner" color={{ color: 'primary', intensity: 500 }} />
        </Box>
      ) : (
        <Box className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.items ?? []).map((post) => (
            <BlogPostCard key={post.id} post={post} onClick={() => navigate(`/blog/${post.id}`)} />
          ))}
        </Box>
      )}

      {data && data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
      )}
    </Box>
  );
};

export default BlogIndexPage;
