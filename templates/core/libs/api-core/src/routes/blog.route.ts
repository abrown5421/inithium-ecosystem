import { Router } from 'express';
import type { Request, Response, Router as RouterType } from 'express';
import {
  asyncHandler,
  createSuccessResponse,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@inithium/api-utils';
import { requireAuth, requireRole } from '@inithium/auth';
import {
  addCommentToBlogPost,
  createBlogPost,
  deleteBlogPost,
  deleteBlogPostComment,
  generateExcerptFromHtml,
  getBlogPostById,
  getSetting,
  getUserRepository,
  listBlogAuthors,
  listBlogCategories,
  listBlogPosts,
  replyToBlogPostComment,
  updateBlogPost,
} from '@inithium/db';
import type { BlogPostSearchField, UserEntity } from '@inithium/db';
import { createNotification } from '@inithium/notifications';
import {
  addCommentSchema,
  createBlogPostSchema,
  replyToCommentSchema,
  updateBlogPostSchema,
} from '../schemas/blog.schema';

const router: RouterType = Router();

const SEARCH_FIELDS = ['title', 'category', 'authorName'] as const;
const isSearchField = (value: unknown): value is BlogPostSearchField =>
  typeof value === 'string' && (SEARCH_FIELDS as readonly string[]).includes(value);

const normalizeParam = (raw: string | string[]): string => (Array.isArray(raw) ? raw[0] : raw);

const resolveDisplayName = (user: UserEntity): string =>
  user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;

// The generic settings system defaults to "on" until an admin has ever touched the toggle -
// matches the CMS Settings module's own fallback-to-definition-default behavior for a boolean
// setting nothing has been saved for yet.
const areCommentsEnabled = async (): Promise<boolean> => {
  const setting = await getSetting('blog.commentsEnabled');
  return setting && setting.type === 'boolean' ? setting.value : true;
};

router.get(
  '/api/blog',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query['page']) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query['pageSize']) || 12));
    const rawAuthor = typeof req.query['author'] === 'string' ? req.query['author'].trim() : undefined;
    const rawCategory = typeof req.query['category'] === 'string' ? req.query['category'].trim() : undefined;
    const rawSearch = typeof req.query['search'] === 'string' ? req.query['search'].trim() : undefined;
    const rawSearchField = req.query['searchField'];
    const searchField = isSearchField(rawSearchField) ? rawSearchField : 'title';

    const result = await listBlogPosts({
      page,
      pageSize,
      author: rawAuthor || undefined,
      category: rawCategory || undefined,
      search: rawSearch || undefined,
      searchField: rawSearch ? searchField : undefined,
    });

    res.status(200).json(
      createSuccessResponse(result.items, {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
      }),
    );
  }),
);

// Registered before "/api/blog/:id" - Express matches routes in registration order, and
// "/api/blog/categories"/"/api/blog/authors" would otherwise be swallowed by the ":id" param
// route (getBlogPostById('categories') -> 404) since a literal segment isn't preferred over a
// param one at the routing layer the way it is in the frontend's own routePattern matching.
router.get(
  '/api/blog/categories',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await listBlogCategories();
    res.status(200).json(createSuccessResponse(categories));
  }),
);

router.get(
  '/api/blog/authors',
  asyncHandler(async (_req: Request, res: Response) => {
    const authors = await listBlogAuthors();
    res.status(200).json(createSuccessResponse(authors));
  }),
);

router.get(
  '/api/blog/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const post = await getBlogPostById(id);
    if (!post) {
      throw NotFoundError('Blog post not found');
    }
    res.status(200).json(createSuccessResponse(post));
  }),
);

router.post(
  '/api/blog/:id/comments',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const parsed = addCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ValidationError('Invalid request body', parsed.error.flatten());
    }

    // Staff (anyone who can create/edit/reply to posts) never comments as a reader - this also
    // means an admin can never end up replying to their own comment (the exact scenario that
    // broke the realtime notification layer during testing: two staff accounts replying back and
    // forth is a real path, but staff-to-self never should be).
    if (req.user!.role === 'admin' || req.user!.role === 'editor') {
      throw ForbiddenError('Admins and editors cannot comment on blog posts');
    }

    if (!(await areCommentsEnabled())) {
      throw ForbiddenError('Comments are currently disabled for this blog');
    }

    const post = await getBlogPostById(id);
    if (!post) {
      throw NotFoundError('Blog post not found');
    }

    const commenter = await getUserRepository().findById(req.user!.sub);
    if (!commenter) {
      throw NotFoundError('User not found');
    }

    const updated = await addCommentToBlogPost(id, {
      userId: commenter.id,
      userName: resolveDisplayName(commenter),
      comment: parsed.data.comment,
    });
    if (!updated) {
      throw NotFoundError('Blog post not found');
    }

    if (post.authorId !== commenter.id) {
      await createNotification({
        userId: post.authorId,
        type: 'blog:comment-received',
        title: `${resolveDisplayName(commenter)} commented on "${post.title}"`,
        body: parsed.data.comment,
        actionUrl: `/blog/${post.id}`,
        icon: 'ChatCircle',
      });
    }

    res.status(201).json(createSuccessResponse(updated));
  }),
);

router.post(
  '/api/blog',
  requireAuth,
  requireRole('admin', 'editor'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createBlogPostSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ValidationError('Invalid request body', parsed.error.flatten());
    }

    const author = await getUserRepository().findById(req.user!.sub);
    if (!author) {
      throw NotFoundError('User not found');
    }

    const post = await createBlogPost({
      title: parsed.data.title,
      body: parsed.data.body,
      excerpt: parsed.data.excerpt || generateExcerptFromHtml(parsed.data.body),
      category: parsed.data.category,
      authorId: author.id,
      authorName: resolveDisplayName(author),
      image: parsed.data.image,
    });

    res.status(201).json(createSuccessResponse(post));
  }),
);

router.put(
  '/api/blog/:id',
  requireAuth,
  requireRole('admin', 'editor'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const parsed = updateBlogPostSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ValidationError('Invalid request body', parsed.error.flatten());
    }

    // Only regenerate the excerpt when the body changed and no explicit excerpt was supplied
    // alongside it - an excerpt-only edit (or a body edit that also supplies its own excerpt)
    // should never be silently overwritten.
    const excerpt =
      parsed.data.body && !parsed.data.excerpt ? generateExcerptFromHtml(parsed.data.body) : parsed.data.excerpt;

    const post = await updateBlogPost(id, { ...parsed.data, excerpt });
    if (!post) {
      throw NotFoundError('Blog post not found');
    }

    res.status(200).json(createSuccessResponse(post));
  }),
);

router.delete(
  '/api/blog/:id',
  requireAuth,
  requireRole('admin', 'editor'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const deleted = await deleteBlogPost(id);
    if (!deleted) {
      throw NotFoundError('Blog post not found');
    }
    res.status(204).send();
  }),
);

router.post(
  '/api/blog/:id/comments/:commentId/reply',
  requireAuth,
  requireRole('admin', 'editor'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const commentId = normalizeParam(req.params.commentId);
    const parsed = replyToCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ValidationError('Invalid request body', parsed.error.flatten());
    }

    const post = await getBlogPostById(id);
    if (!post) {
      throw NotFoundError('Blog post not found');
    }
    const comment = post.comments.find((candidate) => candidate.id === commentId);
    if (!comment) {
      throw NotFoundError('Comment not found');
    }
    // Strictly one reply per comment - a second reply attempt is a conflict, not a silent
    // overwrite of whatever an admin already told the commenter.
    if (comment.reply) {
      throw ConflictError('This comment already has a reply');
    }

    const updated = await replyToBlogPostComment(id, commentId, parsed.data.reply);
    if (!updated) {
      throw NotFoundError('Blog post not found');
    }

    if (comment.userId !== req.user!.sub) {
      await createNotification({
        userId: comment.userId,
        type: 'blog:comment-replied',
        title: `Your comment on "${post.title}" received a reply`,
        body: parsed.data.reply,
        actionUrl: `/blog/${post.id}`,
        icon: 'ChatCircle',
      });
    }

    res.status(200).json(createSuccessResponse(updated));
  }),
);

router.delete(
  '/api/blog/:id/comments/:commentId',
  requireAuth,
  requireRole('admin', 'editor'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const commentId = normalizeParam(req.params.commentId);
    const updated = await deleteBlogPostComment(id, commentId);
    if (!updated) {
      throw NotFoundError('Blog post not found');
    }
    res.status(200).json(createSuccessResponse(updated));
  }),
);

export default router;
