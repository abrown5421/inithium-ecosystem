import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  ListRow,
  Pagination,
  SearchFilterBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  dialog,
} from '@inithium/ui';
import { useDeleteBlogPostMutation, useListBlogPostsQuery } from '@inithium/api-client';
import type { BlogPostSearchField } from '@inithium/db';
import type { BlogPostEntity } from '@inithium/api-client';
import { BlogPostEditDialog } from './BlogPostEditDialog';
import { BlogCommentsPanel } from './BlogCommentsPanel';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const FIELD_OPTIONS: { value: BlogPostSearchField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'category', label: 'Category' },
  { value: 'authorName', label: 'Author' },
];

// First module in this codebase to use Tabs at the module-body level (every other Tabs usage
// lives inside a dialog) - "Posts" and "Comments" share `selectedPostId` state lifted here so a
// row's "View Comments" action can jump straight to that post's comment thread.
export const BlogAdminModule = () => {
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(undefined);

  const [page, setPage] = useState(1);
  const [searchField, setSearchField] = useState<BlogPostSearchField>('title');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, searchField]);

  const { data, isLoading, refetch } = useListBlogPostsQuery({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    searchField,
  });
  const [deleteBlogPost] = useDeleteBlogPostMutation();

  const openCreateDialog = () => {
    const id = dialog.show(
      () => (
        <BlogPostEditDialog
          mode="create"
          onDone={() => {
            dialog.close(id);
            refetch();
          }}
        />
      ),
      { title: 'New Post', width: 720 },
    );
  };

  const openEditDialog = (post: BlogPostEntity) => {
    const id = dialog.show(
      () => (
        <BlogPostEditDialog
          mode="edit"
          initialPost={post}
          onDone={() => {
            dialog.close(id);
            refetch();
          }}
        />
      ),
      { title: `Edit "${post.title}"`, width: 720 },
    );
  };

  const handleDelete = async (post: BlogPostEntity) => {
    const confirmed = await dialog.confirm({
      title: 'Delete post?',
      description: `This will permanently delete "${post.title}" and all of its comments. This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmVariant: { kind: 'filled', color: 'red' },
    });
    if (!confirmed) return;
    await deleteBlogPost(post.id).unwrap();
    refetch();
  };

  const openComments = (post: BlogPostEntity) => {
    setSelectedPostId(post.id);
    setActiveTab('comments');
  };

  return (
    <Box padding={{ base: 24 }} flex={{ direction: 'col', gap: 16 }}>
      <Text as="h1" className="text-2xl font-bold text-surface-950">
        Blog
      </Text>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <Box flex={{ direction: 'col', gap: 16 }}>
            <Box flex={{ direction: 'row', justify: 'between', align: 'center', gap: 16 }}>
              <SearchFilterBar
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchField={searchField}
                onSearchFieldChange={(value) => setSearchField(value as BlogPostSearchField)}
                fieldOptions={FIELD_OPTIONS}
                placeholder="Search posts..."
                className="flex-1"
              />
              <Button variant={{ kind: 'filled', color: 'primary' }} onClick={openCreateDialog}>
                New Post
              </Button>
            </Box>

            <Box
              flex={{ direction: 'col' }}
              borderColor={{ color: 'surface', intensity: 200 }}
              className="rounded border"
            >
              {isLoading ? (
                <Box padding={{ base: 24 }}>
                  <Text as="p" className="text-surface-500">
                    Loading posts...
                  </Text>
                </Box>
              ) : data && data.items.length > 0 ? (
                data.items.map((post) => (
                  <ListRow
                    key={post.id}
                    trailing={
                      <>
                        <IconButton icon="ChatCircle" label={`View comments on ${post.title}`} onClick={() => openComments(post)} />
                        <IconButton icon="PencilSimple" label={`Edit ${post.title}`} onClick={() => openEditDialog(post)} />
                        <IconButton
                          icon="Trash"
                          label={`Delete ${post.title}`}
                          textColor={{ color: 'red', intensity: 600 }}
                          onClick={() => handleDelete(post)}
                        />
                      </>
                    }
                  >
                    <Text as="span" className="font-medium text-surface-950">
                      {post.title}
                    </Text>
                    <Text as="span" className="text-sm text-surface-600">
                      {post.category} · {post.authorName} · {post.comments.length} comment
                      {post.comments.length === 1 ? '' : 's'}
                    </Text>
                  </ListRow>
                ))
              ) : (
                <Box padding={{ base: 24 }}>
                  <Text as="p" className="text-surface-500">
                    No posts found.
                  </Text>
                </Box>
              )}
            </Box>

            {data && data.totalPages > 1 ? (
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            ) : null}
          </Box>
        </TabsContent>

        <TabsContent value="comments">
          <BlogCommentsPanel postId={selectedPostId} />
        </TabsContent>
      </Tabs>
    </Box>
  );
};
