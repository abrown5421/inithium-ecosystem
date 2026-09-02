import type { PaginatedResult } from './pagination.contract';

export type BlogPostSearchField = 'title' | 'category' | 'authorName';

export interface CommentEntity {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  reply?: string;
  createdAt: Date;
}

export interface AddCommentInput {
  userId: string;
  userName: string;
  comment: string;
}

export interface BlogPostEntity {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  category: string;
  authorId: string;
  authorName: string;
  image?: string;
  comments: CommentEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateBlogPostInput = Omit<BlogPostEntity, 'id' | 'createdAt' | 'updatedAt' | 'comments'>;
// authorId/authorName are set once at creation from the creator's own JWT identity and are
// never reassignable on update - omitted here rather than merely optional, so a stray `authorId`
// in a PUT body can never silently reassign a post's ownership.
export type UpdateBlogPostInput = Partial<Omit<CreateBlogPostInput, 'authorId' | 'authorName'>>;

export interface FindManyBlogPostsOptions {
  page: number;
  pageSize: number;
  // Exact matches against a real distinct value (the public /blog listing's author/category
  // dropdowns are populated from findDistinctAuthors/findDistinctCategories, not free-typed) -
  // usable together or independently. Exact, not partial: a partial/regex match here would have
  // "Tech" also match a distinct "Technology" category, which is wrong once the value comes from
  // a dropdown of real, exact distinct values rather than free text.
  author?: string;
  category?: string;
  // Single-field free-text search, mirroring page.repository.ts's admin-search shape - used by
  // the CMS Blog module's SearchFilterBar and the public listing's title search, not the
  // author/category dropdowns above.
  search?: string;
  searchField?: BlogPostSearchField;
}

export interface BlogRepository {
  findMany: (options: FindManyBlogPostsOptions) => Promise<PaginatedResult<BlogPostEntity>>;
  findById: (id: string) => Promise<BlogPostEntity | null>;
  create: (input: CreateBlogPostInput) => Promise<BlogPostEntity>;
  update: (id: string, input: UpdateBlogPostInput) => Promise<BlogPostEntity | null>;
  delete: (id: string) => Promise<boolean>;
  addComment: (postId: string, input: AddCommentInput) => Promise<BlogPostEntity | null>;
  replyToComment: (postId: string, commentId: string, reply: string) => Promise<BlogPostEntity | null>;
  deleteComment: (postId: string, commentId: string) => Promise<BlogPostEntity | null>;
  findDistinctCategories: () => Promise<string[]>;
  findDistinctAuthors: () => Promise<string[]>;
}
