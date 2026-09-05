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
import { requireAuth } from '@inithium/auth';
import {
  createFriendRequest,
  deleteFriend,
  findFriendBetweenUsers,
  getFriendById,
  getUserRepository,
  listAcceptedFriendsForUser,
  listPendingFriendsForUser,
  listRelatedFriendUserIds,
  listUsers,
  markIncomingFriendRequestsSeen,
  updateFriendStatus,
} from '@inithium/db';
import type { FriendEntity, UserEntity } from '@inithium/db';
import { createNotification } from '@inithium/notifications';
import { createFriendRequestSchema } from '../schemas/friends.schema';

const router: RouterType = Router();

// Direct-fetch-then-filter batch size for the "Add Friends" candidate pool (see fetchCandidatePool
// below) - a scaffold-appropriate simplification: friend/candidate pools are expected to be small
// relative to a whole user base, so resolving names + excluding related ids in this layer (rather
// than teaching the user repository a friends-aware query) keeps @inithium/db's user domain
// completely untouched by this plugin.
const CANDIDATE_FETCH_LIMIT = 500;

const normalizeParam = (raw: string | string[]): string => (Array.isArray(raw) ? raw[0] : raw);

const resolveDisplayName = (user: UserEntity): string =>
  user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;

// Matches the spec's "search bar should utilize the first name and last name fields" - a single
// free-text term against the concatenated full name covers matching either field (or both).
const matchesSearch = (user: UserEntity, search: string): boolean =>
  `${user.firstName} ${user.lastName ?? ''}`.toLowerCase().includes(search.toLowerCase());

const toUserSummary = (user: UserEntity, includeEmail: boolean) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  avatar: user.avatar,
  ...(includeEmail ? { email: user.email } : {}),
});

const resolveDirection = (friend: FriendEntity, viewerId: string): 'incoming' | 'outgoing' =>
  friend.requesterId === viewerId ? 'outgoing' : 'incoming';

const paginate = <T,>(items: T[], page: number, pageSize: number) => {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
};

const parsePagination = (req: Request): { page: number; pageSize: number; search?: string } => ({
  page: Math.max(1, Number(req.query['page']) || 1),
  pageSize: Math.min(100, Math.max(1, Number(req.query['pageSize']) || 20)),
  search: typeof req.query['search'] === 'string' && req.query['search'].trim() ? req.query['search'].trim() : undefined,
});

// The other user's id in a relationship row, relative to whoever's asking.
const otherUserId = (friend: FriendEntity, viewerId: string): string =>
  friend.requesterId === viewerId ? friend.requesteeId : friend.requesterId;

// Resolves each row's "other user", drops rows whose other user no longer exists, and applies the
// optional name search - shared by the owned-list ('friends'/'pending') and of/:userId endpoints.
const resolveOtherUsers = async (
  friends: FriendEntity[],
  viewerId: string,
  search: string | undefined,
): Promise<Array<{ friend: FriendEntity; user: UserEntity }>> => {
  const resolved = await Promise.all(
    friends.map(async (friend) => ({ friend, user: await getUserRepository().findById(otherUserId(friend, viewerId)) })),
  );
  return resolved
    .filter((entry): entry is { friend: FriendEntity; user: UserEntity } => entry.user !== null)
    .filter((entry) => !search || matchesSearch(entry.user, search));
};

// Fetches a generous batch of users (optionally narrowed by an OR-style firstName/lastName
// search, since the underlying findMany only supports one search field at a time) for the
// "Add Friends" candidate pool to then exclude/paginate in this layer.
const fetchCandidatePool = async (search: string | undefined): Promise<UserEntity[]> => {
  if (!search) {
    const result = await listUsers({ page: 1, pageSize: CANDIDATE_FETCH_LIMIT });
    return result.items;
  }
  const [byFirstName, byLastName] = await Promise.all([
    listUsers({ page: 1, pageSize: CANDIDATE_FETCH_LIMIT, search, searchField: 'firstName' }),
    listUsers({ page: 1, pageSize: CANDIDATE_FETCH_LIMIT, search, searchField: 'lastName' }),
  ]);
  const byId = new Map<string, UserEntity>();
  for (const user of [...byFirstName.items, ...byLastName.items]) byId.set(user.id, user);
  return [...byId.values()];
};

// GET /api/friends?view=friends|pending - the caller's own accepted list, or their own
// sent+pending list (either direction). Registered before the more specific sub-paths below only
// as a readability convention - none of these share a dynamic first segment, so there's no actual
// Express ordering hazard (unlike blog.route.ts's /categories vs /:id case).
router.get(
  '/api/friends',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const viewerId = req.user!.sub;
    const { page, pageSize, search } = parsePagination(req);
    const view = req.query['view'] === 'pending' ? 'pending' : 'friends';

    const rows = view === 'pending' ? await listPendingFriendsForUser(viewerId) : await listAcceptedFriendsForUser(viewerId);
    const resolved = await resolveOtherUsers(rows, viewerId, search);
    const { items, meta } = paginate(resolved, page, pageSize);

    res.status(200).json(
      createSuccessResponse(
        items.map(({ friend, user }) => ({
          friendId: friend.id,
          status: friend.status,
          direction: resolveDirection(friend, viewerId),
          requestedAt: friend.requestedAt,
          acceptedAt: friend.acceptedAt,
          user: toUserSummary(user, true),
        })),
        meta,
      ),
    );
  }),
);

router.get(
  '/api/friends/candidates',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const viewerId = req.user!.sub;
    const { page, pageSize, search } = parsePagination(req);

    const excludedIds = new Set([viewerId, ...(await listRelatedFriendUserIds(viewerId))]);
    const pool = (await fetchCandidatePool(search)).filter((user) => !excludedIds.has(user.id));
    const { items, meta } = paginate(pool, page, pageSize);

    res.status(200).json(createSuccessResponse(items.map((user) => toUserSummary(user, true)), meta));
  }),
);

// The target user's accepted friends (view=all), optionally intersected with the caller's own
// accepted friends (view=mutual) - powers the unowned-profile sidebar's Mutual/All Friends views.
router.get(
  '/api/friends/of/:userId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const viewerId = req.user!.sub;
    const targetUserId = normalizeParam(req.params.userId);
    const { page, pageSize, search } = parsePagination(req);
    const view = req.query['view'] === 'mutual' ? 'mutual' : 'all';

    const targetRows = await listAcceptedFriendsForUser(targetUserId);
    let resolved = await resolveOtherUsers(targetRows, targetUserId, search);

    if (view === 'mutual') {
      const viewerFriendIds = new Set((await listAcceptedFriendsForUser(viewerId)).map((friend) => otherUserId(friend, viewerId)));
      resolved = resolved.filter(({ user }) => viewerFriendIds.has(user.id));
    }

    const { items, meta } = paginate(resolved, page, pageSize);

    res.status(200).json(
      createSuccessResponse(
        items.map(({ friend, user }) => ({ acceptedAt: friend.acceptedAt, user: toUserSummary(user, false) })),
        meta,
      ),
    );
  }),
);

// The relationship between the caller and :userId, if any - powers the unowned-profile sidebar's
// status text ("Friends for X days" / "You requested ... X days ago") and action buttons.
router.get(
  '/api/friends/status/:userId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const viewerId = req.user!.sub;
    const otherId = normalizeParam(req.params.userId);

    const friend = await findFriendBetweenUsers(viewerId, otherId);
    if (!friend) {
      res.status(200).json(createSuccessResponse({ exists: false }));
      return;
    }

    res.status(200).json(
      createSuccessResponse({
        exists: true,
        friendId: friend.id,
        status: friend.status,
        direction: resolveDirection(friend, viewerId),
        requestedAt: friend.requestedAt,
        acceptedAt: friend.acceptedAt,
      }),
    );
  }),
);

router.post(
  '/api/friends/requests',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createFriendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ValidationError('Invalid request body', parsed.error.flatten());
    }

    const requesterId = req.user!.sub;
    const { requesteeId } = parsed.data;

    if (requesteeId === requesterId) {
      throw ValidationError('You cannot send a friend request to yourself');
    }

    const requestee = await getUserRepository().findById(requesteeId);
    if (!requestee) {
      throw NotFoundError('User not found');
    }

    const existing = await findFriendBetweenUsers(requesterId, requesteeId);
    if (existing) {
      throw ConflictError('A friend relationship already exists between these users');
    }

    const requester = await getUserRepository().findById(requesterId);
    if (!requester) {
      throw NotFoundError('User not found');
    }

    const friend = await createFriendRequest({ requesterId, requesteeId });

    await createNotification({
      userId: requesteeId,
      type: 'friend:request-received',
      title: `${resolveDisplayName(requester)} sent you a friend request`,
      actionUrl: `/profile/${requesterId}`,
      icon: 'UserPlus',
    });

    res.status(201).json(createSuccessResponse(friend));
  }),
);

router.post(
  '/api/friends/requests/:id/accept',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const friend = await getFriendById(id);
    if (!friend) {
      throw NotFoundError('Friend request not found');
    }
    if (friend.requesteeId !== req.user!.sub) {
      throw ForbiddenError('Only the requestee can accept this request');
    }
    if (friend.status === 'accepted') {
      throw ConflictError('This friend request has already been accepted');
    }

    const updated = await updateFriendStatus(id, 'accepted');
    if (!updated) {
      throw NotFoundError('Friend request not found');
    }

    const requestee = await getUserRepository().findById(friend.requesteeId);
    if (requestee) {
      await createNotification({
        userId: friend.requesterId,
        type: 'friend:request-accepted',
        title: `${resolveDisplayName(requestee)} accepted your friend request`,
        actionUrl: `/profile/${friend.requesteeId}`,
        icon: 'UserCheck',
      });
    }

    res.status(200).json(createSuccessResponse(updated));
  }),
);

// Covers rescind (requester deletes their own outgoing request), decline (requestee deletes an
// incoming request), and unfriend (either side deletes an accepted relationship) - all three are
// "delete this relationship row," distinguished only by who's allowed to call it and the row's
// current status, so one endpoint serves all three per the spec's "infinite denials" model.
router.delete(
  '/api/friends/requests/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = normalizeParam(req.params.id);
    const friend = await getFriendById(id);
    if (!friend) {
      throw NotFoundError('Friend request not found');
    }
    const callerId = req.user!.sub;
    if (callerId !== friend.requesterId && callerId !== friend.requesteeId) {
      throw ForbiddenError('You are not part of this relationship');
    }

    await deleteFriend(id);
    res.status(204).send();
  }),
);

// Bulk seen-flip - called from the frontend whenever the caller views a friend-request
// notification in the notification center (see apps/web/src/app/app.tsx's onNotificationClick/
// onMarkAllNotificationsRead), not per-notification-id, since "viewing the notification center" is
// the coarse-grained action the spec ties this flip to.
router.patch(
  '/api/friends/requests/seen',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const count = await markIncomingFriendRequestsSeen(req.user!.sub);
    res.status(200).json(createSuccessResponse({ count }));
  }),
);

export default router;
