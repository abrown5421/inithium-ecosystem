import type { Model, QueryFilter } from 'mongoose';
import {
  AddCommentInput,
  BlogPostEntity,
  BlogRepository,
  CommentEntity,
  CreateBlogPostInput,
  FindManyBlogPostsOptions,
  UpdateBlogPostInput,
} from '../../contracts/blog.contract';
import type { PaginatedResult } from '../../contracts/pagination.contract';
import { escapeRegExp } from '../../utils/escapeRegExp';
import { BlogPostDocument, CommentDocument } from '../../schemas/blog-post.schema';

const mapToCommentEntity = (doc: CommentDocument): CommentEntity => ({
  id: doc._id.toString(),
  userId: doc.userId,
  userName: doc.userName,
  comment: doc.comment,
  reply: doc.reply,
  createdAt: doc.createdAt,
});

const mapToBlogPostEntity = (doc: BlogPostDocument): BlogPostEntity => ({
  id: doc._id.toString(),
  title: doc.title,
  body: doc.body,
  excerpt: doc.excerpt,
  category: doc.category,
  authorId: doc.authorId,
  authorName: doc.authorName,
  image: doc.image,
  comments: doc.comments.map(mapToCommentEntity),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const createMongoBlogPostRepository = (model: Model<BlogPostDocument>): BlogRepository => ({
  findMany: async (options: FindManyBlogPostsOptions): Promise<PaginatedResult<BlogPostEntity>> => {
    const { page, pageSize, author, category, search, searchField } = options;
    const filter: QueryFilter<BlogPostDocument> = {};
    if (author) {
      filter.authorName = author;
    }
    if (category) {
      filter.category = category;
    }
    if (search && searchField) {
      filter[searchField] = { $regex: escapeRegExp(search), $options: 'i' };
    }

    const skip = (page - 1) * pageSize;
    const [docs, total] = await Promise.all([
      model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).exec(),
      model.countDocuments(filter).exec(),
    ]);

    return { items: docs.map(mapToBlogPostEntity), total, page, pageSize };
  },
  findById: async (id: string): Promise<BlogPostEntity | null> => {
    const post = await model.findById(id).exec();
    return post ? mapToBlogPostEntity(post) : null;
  },
  create: async (input: CreateBlogPostInput): Promise<BlogPostEntity> => {
    const post = await model.create({ ...input, comments: [] });
    return mapToBlogPostEntity(post);
  },
  update: async (id: string, input: UpdateBlogPostInput): Promise<BlogPostEntity | null> => {
    const post = await model.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).exec();
    return post ? mapToBlogPostEntity(post) : null;
  },
  delete: async (id: string): Promise<boolean> => {
    const result = await model.findByIdAndDelete(id).exec();
    return result !== null;
  },
  addComment: async (postId: string, input: AddCommentInput): Promise<BlogPostEntity | null> => {
    const post = await model
      .findByIdAndUpdate(
        postId,
        { $push: { comments: { ...input, createdAt: new Date() } } },
        { new: true, runValidators: true }
      )
      .exec();
    return post ? mapToBlogPostEntity(post) : null;
  },
  // Whether `reply` is already set is enforced by the route layer (a pre-read + ConflictError),
  // not here - this mirrors how other business rules (e.g. the users route's self-lockout guard)
  // live at the route layer rather than being baked into the repository.
  replyToComment: async (postId: string, commentId: string, reply: string): Promise<BlogPostEntity | null> => {
    const post = await model
      .findOneAndUpdate(
        { _id: postId, 'comments._id': commentId },
        { $set: { 'comments.$.reply': reply } },
        { new: true, runValidators: true }
      )
      .exec();
    return post ? mapToBlogPostEntity(post) : null;
  },
  deleteComment: async (postId: string, commentId: string): Promise<BlogPostEntity | null> => {
    const post = await model
      .findByIdAndUpdate(postId, { $pull: { comments: { _id: commentId } } }, { new: true })
      .exec();
    return post ? mapToBlogPostEntity(post) : null;
  },
  findDistinctCategories: async (): Promise<string[]> => model.distinct('category').exec(),
  findDistinctAuthors: async (): Promise<string[]> => model.distinct('authorName').exec(),
});
