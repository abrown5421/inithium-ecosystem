import type { ApiResponse } from '@inithium/api-utils';
import type { BlogPostSearchField } from '@inithium/db';
import { baseApi } from '../baseApi';

// Frontend-facing shape, not @inithium/db's BlogPostEntity - dates cross the HTTP boundary as
// ISO strings, not Date instances, mirroring AdminUser's own precedent in users.endpoints.ts
// (rather than page.endpoints.ts's direct PageEntity re-use, which happens to never render a
// date field so the same Date/string mismatch there has never been exercised).
export interface CommentEntity {
  id: string;
  userId: string;
  userName: string;
  comment: string;
  reply?: string;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface ListBlogPostsParams {
  page: number;
  pageSize: number;
  author?: string;
  category?: string;
  search?: string;
  searchField?: BlogPostSearchField;
}

export interface ListBlogPostsResult {
  items: BlogPostEntity[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateBlogPostInput {
  title: string;
  body: string;
  excerpt?: string;
  category: string;
  image?: string;
}

export type UpdateBlogPostInput = Partial<CreateBlogPostInput> & { id: string };

export const blogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listBlogPosts: builder.query<ListBlogPostsResult, ListBlogPostsParams>({
      query: ({ page, pageSize, author, category, search, searchField }) => {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (author) params.set('author', author);
        if (category) params.set('category', category);
        if (search) params.set('search', search);
        if (searchField) params.set('searchField', searchField);
        return `/api/blog?${params.toString()}`;
      },
      transformResponse: (response: ApiResponse<BlogPostEntity[]>): ListBlogPostsResult => ({
        items: response.data,
        page: (response.meta?.['page'] as number) ?? 1,
        pageSize: (response.meta?.['pageSize'] as number) ?? response.data.length,
        total: (response.meta?.['total'] as number) ?? response.data.length,
        totalPages: (response.meta?.['totalPages'] as number) ?? 1,
      }),
      providesTags: ['Post'],
    }),
    getBlogPost: builder.query<BlogPostEntity, string>({
      query: (id) => `/api/blog/${id}`,
      transformResponse: (response: ApiResponse<BlogPostEntity>) => response.data,
      providesTags: (result) => (result ? [{ type: 'Post', id: result.id }, 'Comment'] : ['Post']),
    }),
    createBlogPost: builder.mutation<BlogPostEntity, CreateBlogPostInput>({
      query: (input) => ({ url: '/api/blog', method: 'POST', body: input }),
      transformResponse: (response: ApiResponse<BlogPostEntity>) => response.data,
      invalidatesTags: ['Post'],
    }),
    updateBlogPost: builder.mutation<BlogPostEntity, UpdateBlogPostInput>({
      query: ({ id, ...input }) => ({ url: `/api/blog/${id}`, method: 'PUT', body: input }),
      transformResponse: (response: ApiResponse<BlogPostEntity>) => response.data,
      invalidatesTags: ['Post'],
    }),
    deleteBlogPost: builder.mutation<void, string>({
      query: (id) => ({ url: `/api/blog/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Post'],
    }),
    addBlogComment: builder.mutation<BlogPostEntity, { id: string; comment: string }>({
      query: ({ id, comment }) => ({ url: `/api/blog/${id}/comments`, method: 'POST', body: { comment } }),
      transformResponse: (response: ApiResponse<BlogPostEntity>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Post', id }, 'Comment'],
    }),
    replyToBlogComment: builder.mutation<BlogPostEntity, { id: string; commentId: string; reply: string }>({
      query: ({ id, commentId, reply }) => ({
        url: `/api/blog/${id}/comments/${commentId}/reply`,
        method: 'POST',
        body: { reply },
      }),
      transformResponse: (response: ApiResponse<BlogPostEntity>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Post', id }, 'Comment'],
    }),
    deleteBlogComment: builder.mutation<BlogPostEntity, { id: string; commentId: string }>({
      query: ({ id, commentId }) => ({ url: `/api/blog/${id}/comments/${commentId}`, method: 'DELETE' }),
      transformResponse: (response: ApiResponse<BlogPostEntity>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Post', id }, 'Comment'],
    }),
    // Populate the public listing's author/category filter dropdowns with real, existing
    // values - tagged 'Post' so a new post's new category/author shows up the moment any
    // Post-tagged query is invalidated, same as every other blog list data.
    listBlogCategories: builder.query<string[], void>({
      query: () => '/api/blog/categories',
      transformResponse: (response: ApiResponse<string[]>) => response.data,
      providesTags: ['Post'],
    }),
    listBlogAuthors: builder.query<string[], void>({
      query: () => '/api/blog/authors',
      transformResponse: (response: ApiResponse<string[]>) => response.data,
      providesTags: ['Post'],
    }),
  }),
});

export const {
  useListBlogPostsQuery,
  useGetBlogPostQuery,
  useCreateBlogPostMutation,
  useUpdateBlogPostMutation,
  useDeleteBlogPostMutation,
  useAddBlogCommentMutation,
  useReplyToBlogCommentMutation,
  useDeleteBlogCommentMutation,
  useListBlogCategoriesQuery,
  useListBlogAuthorsQuery,
} = blogApi;
