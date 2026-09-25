import { Router } from 'express';
import type { Request, Response, Router as RouterType } from 'express';
import { asyncHandler, createSuccessResponse, NotFoundError } from '@inithium/api-utils';
import { requireAuth } from '@inithium/auth';
import { requirePermission } from '@inithium/permissions';
import { getOrderRepository, getUserRepository, ORDER_STATUSES } from '@inithium/db';
import type { OrderEntity, OrderStatus } from '@inithium/db';
import { setOrderStatusByAdmin } from '@inithium/ecommerce';
import { setOrderStatusSchema } from '../../schemas/ecommerce.schema';
import { currentUserId, normalizeParam, paginatedResponse, parseBody, parsePaging, queryString } from './ecommerceHttp';

const router: RouterType = Router();
const MANAGE = 'ecommerce:manage-orders';

const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);

// Admin views resolve the purchaser at response time (orders never copy a name/email), falling
// back to empty values if that account has since been deleted.
const toAdminOrderDto = async (order: OrderEntity) => {
  const user = await getUserRepository().findById(order.userId);
  return {
    ...order,
    customer: { id: order.userId, firstName: user?.firstName ?? '', lastName: user?.lastName, email: user?.email ?? '' },
  };
};

router.get(
  '/api/orders/mine',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePaging(req);
    const result = await getOrderRepository().findMany({ page, pageSize, userId: currentUserId(req) });
    res.status(200).json(paginatedResponse(result, result.items));
  }),
);

router.get(
  '/api/orders/mine/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await getOrderRepository().findById(normalizeParam(req.params['id']));
    if (!order || order.userId !== currentUserId(req)) throw NotFoundError('Order not found');
    res.status(200).json(createSuccessResponse(order));
  }),
);

router.get(
  '/api/orders/admin',
  requireAuth,
  requirePermission(MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = parsePaging(req);
    const status = req.query['status'];
    const userId = queryString(req, 'userId');
    const result = await getOrderRepository().findMany({
      page,
      pageSize,
      ...(isOrderStatus(status) ? { status } : {}),
      ...(userId ? { userId } : {}),
    });
    res.status(200).json(paginatedResponse(result, await Promise.all(result.items.map(toAdminOrderDto))));
  }),
);

router.get(
  '/api/orders/admin/:id',
  requireAuth,
  requirePermission(MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    const order = await getOrderRepository().findById(normalizeParam(req.params['id']));
    if (!order) throw NotFoundError('Order not found');
    res.status(200).json(createSuccessResponse(await toAdminOrderDto(order)));
  }),
);

// Records an outcome only (fulfilled / cancelled / refunded) - no money moves. Issuing the actual
// refund is a per-workspace process.
router.patch(
  '/api/orders/admin/:id/status',
  requireAuth,
  requirePermission(MANAGE),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, note } = parseBody(setOrderStatusSchema, req.body);
    const order = await setOrderStatusByAdmin(normalizeParam(req.params['id']), status, currentUserId(req), note);
    res.status(200).json(createSuccessResponse(await toAdminOrderDto(order)));
  }),
);

export default router;
