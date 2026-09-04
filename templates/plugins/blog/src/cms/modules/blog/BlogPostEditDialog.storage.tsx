import { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Box, Button, IconButton, Input, MediaField, Text, Textarea } from '@inithium/ui';
import { useCreateBlogPostMutation, useUpdateBlogPostMutation, useUploadAssetMutation } from '@inithium/api-client';
import type { BlogPostEntity } from '@inithium/api-client';

export interface BlogPostEditDialogProps {
  readonly mode: 'create' | 'edit';
  readonly initialPost?: BlogPostEntity;
  readonly onDone: () => void;
}

// A common landscape/hero-image ratio for a blog post's image - this field has no single fixed
// display container the way Avatar/Banner do, so this is a reasonable default rather than a
// measurement of a real rendered size.
const BLOG_IMAGE_ASPECT_RATIO = 16 / 9;

// A minimal formatting toolbar (bold/italic/lists/headings/blockquote) - this is the first
// Tiptap usage in this codebase, kept deliberately small for v1 rather than guessing at a fuller
// rich-text feature set with no existing consumer to validate it against.
const EditorToolbar = ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
  if (!editor) return null;

  return (
    <Box flex={{ direction: 'row', gap: 4 }} borderColor={{ color: 'surface', intensity: 300 }} padding={{ base: 4 }} className="rounded-t border border-b-0">
      <IconButton icon="TextB" label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} />
      <IconButton icon="TextItalic" label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} />
      <IconButton icon="TextHTwo" label="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <IconButton icon="TextHThree" label="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <IconButton icon="ListBullets" label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <IconButton icon="ListNumbers" label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <IconButton icon="Quotes" label="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} />
    </Box>
  );
};

// Storage-aware replacement of BlogPostEditDialog.tsx - injected by the blog plugin's own
// manifest gated "requires": "storage", so it only lands once the storage plugin is installed
// (deferred until then, reverted back to the plain-URL version if storage is later removed). The
// only change from the plain-URL version is the Image field: MediaField's "Upload" tab appears
// because it's given an onUpload prop here, same mechanism AvatarEditDialog/BannerEditDialog use.
export const BlogPostEditDialog = ({ mode, initialPost, onDone }: BlogPostEditDialogProps) => {
  const [createBlogPost, { isLoading: isCreating }] = useCreateBlogPostMutation();
  const [updateBlogPost, { isLoading: isUpdating }] = useUpdateBlogPostMutation();
  const [uploadAsset] = useUploadAssetMutation();
  const isLoading = isCreating || isUpdating;
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [category, setCategory] = useState(initialPost?.category ?? '');
  const [image, setImage] = useState(initialPost?.image ?? '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? '');

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialPost?.body ?? '',
  });

  const handleSubmit = async () => {
    setSubmitError(undefined);
    const body = editor?.getHTML() ?? '';

    try {
      if (mode === 'create') {
        await createBlogPost({
          title,
          body,
          excerpt: excerpt || undefined,
          category,
          image: image || undefined,
        }).unwrap();
      } else if (initialPost) {
        await updateBlogPost({
          id: initialPost.id,
          title,
          body,
          excerpt: excerpt || undefined,
          category,
          image: image || undefined,
        }).unwrap();
      }
      onDone();
    } catch {
      setSubmitError('Could not save this post. Check the fields and try again.');
    }
  };

  return (
    <Box flex={{ direction: 'col', gap: 16 }}>
      <Input label="Title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <Box flex={{ direction: 'row', gap: 12 }}>
        <Input label="Category" required value={category} onChange={(event) => setCategory(event.target.value)} className="flex-1" />
        <MediaField
          label="Image"
          className="flex-1"
          value={image}
          onValueChange={setImage}
          onUpload={async (file) => await uploadAsset({ file }).unwrap()}
          aspectRatio={BLOG_IMAGE_ASPECT_RATIO}
        />
      </Box>
      <Textarea
        label="Excerpt"
        helperText="Auto-generated from the body's first 3 sentences if left blank."
        value={excerpt}
        onChange={(event) => setExcerpt(event.target.value)}
        rows={2}
      />

      <Box flex={{ direction: 'col' }}>
        <Text as="span" className="text-sm font-medium text-surface-900">
          Body
        </Text>
        <EditorToolbar editor={editor} />
        <Box
          borderColor={{ color: 'surface', intensity: 300 }}
          padding={{ base: 12 }}
          className="min-h-40 rounded-b border text-sm [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-surface-300 [&_blockquote]:pl-4 [&_blockquote]:italic"
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>

      {submitError ? (
        <Text as="p" className="text-sm text-red-600">
          {submitError}
        </Text>
      ) : null}

      <Box flex={{ direction: 'row', gap: 8, justify: 'end' }}>
        <Button variant={{ kind: 'ghost', color: 'surface' }} onClick={onDone} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant={{ kind: 'filled', color: 'primary' }} onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Box>
  );
};
