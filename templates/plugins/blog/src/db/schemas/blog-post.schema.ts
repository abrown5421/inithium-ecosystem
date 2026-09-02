import mongoose, { Schema, Document, Types } from 'mongoose';

export interface CommentDocument extends Document {
  _id: Types.ObjectId;
  userId: string;
  userName: string;
  comment: string;
  reply?: string;
  createdAt: Date;
}

// Only `createdAt` is spec'd for a comment (no `updatedAt`) - set explicitly rather than via
// schema-level `timestamps`, which would add both.
const commentSchema = new Schema<CommentDocument>({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  comment: { type: String, required: true },
  reply: { type: String, required: false },
  createdAt: { type: Date, required: true, default: Date.now },
});

export interface BlogPostDocument extends Document {
  title: string;
  body: string;
  excerpt: string;
  category: string;
  authorId: string;
  authorName: string;
  image?: string;
  comments: Types.DocumentArray<CommentDocument>;
  createdAt: Date;
  updatedAt: Date;
}

const blogPostSchema = new Schema<BlogPostDocument>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    excerpt: { type: String, required: true },
    category: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    authorName: { type: String, required: true },
    image: { type: String, required: false },
    comments: { type: [commentSchema], required: true, default: [] },
  },
  { timestamps: true }
);

export const BlogPostModel =
  mongoose.models['BlogPost'] || mongoose.model<BlogPostDocument>('BlogPost', blogPostSchema);
