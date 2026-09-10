import {
  AddCommentInput,
  CreateBlogPostInput,
  FindManyBlogPostsOptions,
  UpdateBlogPostInput,
} from './contracts/blog.contract';
// inithium:anchor:imports
export const getBlogRepository = () => activeProvider.getBlogRepository();
export const listBlogPosts = (options: FindManyBlogPostsOptions) => getBlogRepository().findMany(options);
export const getBlogPostById = (id: string) => getBlogRepository().findById(id);
export const createBlogPost = (input: CreateBlogPostInput) => getBlogRepository().create(input);
export const updateBlogPost = (id: string, input: UpdateBlogPostInput) => getBlogRepository().update(id, input);
export const deleteBlogPost = (id: string) => getBlogRepository().delete(id);
export const addCommentToBlogPost = (postId: string, input: AddCommentInput) =>
  getBlogRepository().addComment(postId, input);
export const replyToBlogPostComment = (postId: string, commentId: string, reply: string) =>
  getBlogRepository().replyToComment(postId, commentId, reply);
export const deleteBlogPostComment = (postId: string, commentId: string) =>
  getBlogRepository().deleteComment(postId, commentId);
export const listBlogCategories = () => getBlogRepository().findDistinctCategories();
export const listBlogAuthors = () => getBlogRepository().findDistinctAuthors();

// inithium:anchor:repositories
export type {
  BlogPostEntity,
  CommentEntity,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  AddCommentInput,
  BlogPostSearchField,
  FindManyBlogPostsOptions,
  BlogRepository,
} from './contracts/blog.contract';
export { generateExcerptFromHtml } from './utils/generateExcerptFromHtml';
// inithium:anchor:type-exports
