import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Banner, Box, Button, Divider, Loader, Pill, Text, Textarea } from '@inithium/ui';
import {
  useAddBlogCommentMutation,
  useGetBlogPostQuery,
  useGetPublicSettingQuery,
  usePageParams,
} from '@inithium/api-client';
import { useCurrentUser } from '../app/useCurrentUser';
import { NotFoundPage } from './NotFoundPage';
import { generateBlogBannerConfig } from './blogBannerConfig';

export const BlogPostPage = () => {
  // Not react-router-dom's useParams() - this app's routing is fully data-driven with no
  // <Route> anywhere to establish a param-bearing path (see PageShell's own comment), so
  // useParams() always returns {} here. usePageParams() re-derives ":id" from the resolved
  // Page record's own routePattern instead.
  const { id } = usePageParams();
  const { currentUser } = useCurrentUser();
  const { data: post, isLoading } = useGetBlogPostQuery(id ?? '', { skip: !id });
  // Unset (nothing ever saved for this key) defaults to enabled, mirroring the backend
  // route's own fallback and the CMS Settings module's fallback-to-definition-default behavior.
  const { data: commentsEnabledSetting } = useGetPublicSettingQuery('blog.commentsEnabled');
  const commentsEnabled = commentsEnabledSetting?.type === 'boolean' ? commentsEnabledSetting.value : true;

  const [addComment, { isLoading: isSubmittingComment }] = useAddBlogCommentMutation();
  const [commentText, setCommentText] = useState('');

  // Called unconditionally, before the early returns below - hooks can't be called
  // conditionally. Seeded from post.id once loaded, falling back to the route's own id (already
  // known via usePageParams before the post itself loads) so the seed - and therefore the
  // rendered mesh - never changes once the banner actually appears.
  const bannerConfig = useMemo(() => generateBlogBannerConfig(post?.id ?? id ?? 'blog-post'), [post?.id, id]);

  if (isLoading) {
    return (
      <Box flex={{ justify: 'center' }} padding={{ base: 32 }}>
        <Loader variant="spinner" color={{ color: 'primary', intensity: 500 }} />
      </Box>
    );
  }

  if (!post) {
    return <NotFoundPage />;
  }

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim()) return;
    await addComment({ id, comment: commentText.trim() }).unwrap();
    setCommentText('');
  };

  return (
    <Box flex={{ direction: 'col' }}>
      <div className="relative">
        <Banner imageUrl={post.image} trianglifyConfig={bannerConfig} />
        <Pill className="absolute right-3 top-3">{post.category}</Pill>
      </div>

      <Box flex={{ direction: 'col', gap: 16 }} padding={{ base: 64 }}>
        <Text as="h1" className="text-3xl font-bold">
          {post.title}
        </Text>

        <Box flex={{ direction: 'row', justify: 'between' }}>
          <Text className="text-sm text-surface-600">{post.authorName}</Text>
          <Text className="text-sm text-surface-600">{new Date(post.createdAt).toLocaleDateString()}</Text>
        </Box>

        <Divider />

        <div
          className="text-sm leading-relaxed [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-surface-300 [&_blockquote]:pl-4 [&_blockquote]:italic"
          // Post bodies are admin/editor-authored HTML (Tiptap output), still sanitized before
          // render since it renders for every anonymous visitor - never trust the write path alone.
          // No typography plugin is installed in this workspace, so basic element styling is
          // applied directly via arbitrary-variant selectors rather than a "prose" utility class.
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body) }}
        />

        <Divider />

        <Text as="h2" className="text-xl font-semibold">
          Comments
        </Text>

        <Box flex={{ direction: 'col', gap: 16 }}>
          {post.comments.length === 0 && <Text className="text-sm text-surface-600">No comments yet.</Text>}
          {post.comments.map((comment) => (
            <Box key={comment.id} flex={{ direction: 'col', gap: 4 }} className="border-b border-surface-200 pb-4">
              <Box flex={{ direction: 'row', justify: 'between' }}>
                <Text className="text-sm font-semibold">{comment.userName}</Text>
                <Text className="text-xs text-surface-600">{new Date(comment.createdAt).toLocaleDateString()}</Text>
              </Box>
              <Text as="p" className="text-sm">
                {comment.comment}
              </Text>
              {comment.reply && (
                <Box padding={{ left: 16, top: 4 }} className="border-l-2 border-surface-300">
                  <Text className="text-xs font-semibold text-surface-600">Admin reply</Text>
                  <Text as="p" className="text-sm">
                    {comment.reply}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        {currentUser && commentsEnabled && currentUser.role !== 'admin' && currentUser.role !== 'editor' && (
          <Box flex={{ direction: 'col', gap: 8 }}>
            <Textarea
              label="Add a comment"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              rows={3}
            />
            <Button
              variant={{ kind: 'filled', color: 'primary' }}
              onClick={handleSubmitComment}
              disabled={isSubmittingComment || !commentText.trim()}
              className="self-start"
            >
              Post Comment
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default BlogPostPage;
