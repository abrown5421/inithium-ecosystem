import { useState } from 'react';
import { Box, Button, IconButton, ListRow, Text, Textarea, dialog } from '@inithium/ui';
import {
  useDeleteBlogCommentMutation,
  useGetBlogPostQuery,
  useReplyToBlogCommentMutation,
} from '@inithium/api-client';

export interface BlogCommentsPanelProps {
  readonly postId?: string;
}

interface CommentRowProps {
  readonly postId: string;
  readonly comment: {
    readonly id: string;
    readonly userName: string;
    readonly comment: string;
    readonly reply?: string;
    readonly createdAt: string;
  };
}

// One reply per comment, enforced server-side too - the reply form disappears the moment a
// reply exists, mirroring the server's ConflictError rather than merely hiding a "submit" button
// while still letting an admin type a second reply that would only fail on submit.
const CommentRow = ({ postId, comment }: CommentRowProps) => {
  const [replyToComment, { isLoading: isReplying }] = useReplyToBlogCommentMutation();
  const [deleteComment, { isLoading: isDeleting }] = useDeleteBlogCommentMutation();
  const [replyText, setReplyText] = useState('');

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await replyToComment({ id: postId, commentId: comment.id, reply: replyText.trim() }).unwrap();
    setReplyText('');
  };

  const handleDelete = async () => {
    const confirmed = await dialog.confirm({
      title: 'Delete comment?',
      description: 'This will permanently delete this comment. This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmVariant: { kind: 'filled', color: 'red' },
    });
    if (!confirmed) return;
    await deleteComment({ id: postId, commentId: comment.id }).unwrap();
  };

  return (
    <ListRow
      trailing={
        <IconButton
          icon="Trash"
          label="Delete comment"
          textColor={{ color: 'red', intensity: 600 }}
          disabled={isDeleting}
          onClick={handleDelete}
        />
      }
    >
      <Box flex={{ direction: 'row', justify: 'between' }}>
        <Text as="span" className="font-medium">
          {comment.userName}
        </Text>
        <Text as="span" className="text-xs text-surface-600">
          {new Date(comment.createdAt).toLocaleDateString()}
        </Text>
      </Box>
      <Text as="p" className="text-sm">
        {comment.comment}
      </Text>

      {comment.reply ? (
        <Box padding={{ left: 16, top: 4 }} className="border-l-2 border-surface-300">
          <Text className="text-xs font-semibold text-surface-600">Your reply</Text>
          <Text as="p" className="text-sm">
            {comment.reply}
          </Text>
        </Box>
      ) : (
        <Box flex={{ direction: 'col', gap: 8 }} padding={{ top: 8 }}>
          <Textarea
            placeholder="Write a reply..."
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            rows={2}
          />
          <Button
            variant={{ kind: 'filled', color: 'primary' }}
            disabled={isReplying || !replyText.trim()}
            onClick={handleReply}
            className="self-start"
          >
            Reply
          </Button>
        </Box>
      )}
    </ListRow>
  );
};

export const BlogCommentsPanel = ({ postId }: BlogCommentsPanelProps) => {
  const { data: post, isLoading } = useGetBlogPostQuery(postId ?? '', { skip: !postId });

  if (!postId) {
    return (
      <Box padding={{ base: 24 }}>
        <Text as="p" className="text-surface-500">
          Select a post from the Posts tab to view its comments.
        </Text>
      </Box>
    );
  }

  if (isLoading || !post) {
    return (
      <Box padding={{ base: 24 }}>
        <Text as="p" className="text-surface-500">
          Loading comments...
        </Text>
      </Box>
    );
  }

  return (
    <Box flex={{ direction: 'col', gap: 16 }}>
      <Text as="h2" className="text-lg font-semibold">
        Comments on "{post.title}"
      </Text>

      <Box flex={{ direction: 'col' }} borderColor={{ color: 'surface', intensity: 200 }} className="rounded border">
        {post.comments.length === 0 ? (
          <Box padding={{ base: 24 }}>
            <Text as="p" className="text-surface-500">
              No comments yet.
            </Text>
          </Box>
        ) : (
          post.comments.map((comment) => <CommentRow key={comment.id} postId={post.id} comment={comment} />)
        )}
      </Box>
    </Box>
  );
};
