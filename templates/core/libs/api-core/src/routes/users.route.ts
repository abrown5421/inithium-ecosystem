import { Router } from 'express';
import type { Request, Response, Router as RouterType } from 'express';
import {
  asyncHandler,
  createSuccessResponse,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@inithium/api-utils';
import { requireAuth, requireRole, hashPassword } from '@inithium/auth';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserRepository,
  getUserRegistrationsByDay,
} from '@inithium/db';
import type { UserEntity, UserSearchField } from '@inithium/db';
import { createUserSchema, updateUserSchema } from '../schemas/users.schema';

const router: RouterType = Router();

const SEARCH_FIELDS = ['firstName', 'lastName', 'email'] as const;
const isSearchField = (value: unknown): value is UserSearchField =>
  typeof value === 'string' && (SEARCH_FIELDS as readonly string[]).includes(value);

const normalizeId = (raw: string | string[]): string => (Array.isArray(raw) ? raw[0] : raw);

// Every response strips passwordHash, matching auth.route.ts's existing convention of never
// returning the hash on any user-facing endpoint.
const toPublicUser = (user: UserEntity) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  avatar: user.avatar,
  darkMode: user.darkMode,
  createdAt: user.createdAt,
});

router.get(
  '/api/users',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query['page']) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query['pageSize']) || 20));
    const rawSearch = typeof req.query['search'] === 'string' ? req.query['search'] : undefined;
    const search = rawSearch ? rawSearch.trim() : undefined;
    const rawSearchField = req.query['searchField'];
    const searchField = isSearchField(rawSearchField) ? rawSearchField : 'email';

    const result = await listUsers({
      page,
      pageSize,
      search: search || undefined,
      searchField: search ? searchField : undefined,
    });

    res.status(200).json(
      createSuccessResponse(result.items.map(toPublicUser), {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
      }),
    );
  }),
);

router.get(
  '/api/users/stats/registrations',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (_req: Request, res: Response) => {
    const counts = await getUserRegistrationsByDay();
    res.status(200).json(createSuccessResponse(counts));
  }),
);

router.post(
  '/api/users',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ValidationError('Invalid request body', parsed.error.flatten());
    }

    const existing = await getUserRepository().findByEmail(parsed.data.email);
    if (existing) {
      throw ConflictError('A user with this email already exists');
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await createUser({
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      passwordHash,
      role: parsed.data.role,
    });

    res.status(201).json(createSuccessResponse(toPublicUser(user)));
  }),
);

router.patch(
  '/api/users/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ValidationError('Invalid request body', parsed.error.flatten());
    }

    const id = normalizeId(req.params.id);

    // Prevents an admin from accidentally demoting themselves out of the CMS via their own
    // edit form - a cheap guard against an easy, painful self-lockout mistake.
    if (req.user?.sub === id && parsed.data.role !== undefined && parsed.data.role !== 'admin') {
      throw ValidationError('You cannot remove your own admin role');
    }

    if (parsed.data.email) {
      const existing = await getUserRepository().findByEmail(parsed.data.email);
      if (existing && existing.id !== id) {
        throw ConflictError('A user with this email already exists');
      }
    }

    const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : undefined;
    const user = await updateUser(id, {
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      ...(passwordHash ? { passwordHash } : {}),
    });

    if (!user) {
      throw NotFoundError('User not found');
    }

    res.status(200).json(createSuccessResponse(toPublicUser(user)));
  }),
);

router.delete(
  '/api/users/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeId(req.params.id);

    // Same self-lockout concern as PATCH's role guard, applied to deletion.
    if (req.user?.sub === id) {
      throw ValidationError('You cannot delete your own account');
    }

    const deleted = await deleteUser(id);
    if (!deleted) {
      throw NotFoundError('User not found');
    }

    res.status(204).send();
  }),
);

export default router;
