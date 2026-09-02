import { z } from 'zod';

// No Mongoose-side default on any of these fields, so `.partial()` below is a plain "make
// everything optional" with no default-reinjection gotcha to guard against (mirrors
// users.schema.ts's note on the same point).
const blogPostShape = {
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  excerpt: z.string().min(1).optional(),
  category: z.string().min(1, 'Category is required'),
  image: z.string().min(1).optional(),
};

export const createBlogPostSchema = z.object(blogPostShape);
export type CreateBlogPostRequestBody = z.infer<typeof createBlogPostSchema>;

export const updateBlogPostSchema = z.object(blogPostShape).partial();
export type UpdateBlogPostRequestBody = z.infer<typeof updateBlogPostSchema>;

export const addCommentSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
});
export type AddCommentRequestBody = z.infer<typeof addCommentSchema>;

export const replyToCommentSchema = z.object({
  reply: z.string().min(1, 'Reply is required'),
});
export type ReplyToCommentRequestBody = z.infer<typeof replyToCommentSchema>;
