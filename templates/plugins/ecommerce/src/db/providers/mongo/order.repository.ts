import { isValidObjectId } from 'mongoose';
import type { Model, QueryFilter } from 'mongoose';
import {
  CreateOrderInput,
  FindManyOrdersOptions,
  OrderEntity,
  OrderRepository,
  OrderStatus,
  OrderStatusChange,
  UpdateOrderInput,
} from '../../contracts/order.contract';
import type { PaginatedResult } from '../../contracts/pagination.contract';
import { OrderDocument } from '../../schemas/order.schema';

// Statuses that mean a code was actually used - a failed or still-pending checkout never counts
// against a per-user redemption limit.
const REDEEMED_STATUSES: OrderStatus[] = ['paid', 'fulfilled', 'cancelled', 'refunded'];

const mapToOrderEntity = (doc: OrderDocument): OrderEntity => {
  const plain = doc.toObject();
  return {
    id: doc._id.toString(),
    userId: plain.userId,
    kind: plain.kind,
    status: plain.status,
    currency: plain.currency,
    lines: plain.lines ?? [],
    totals: plain.totals,
    discount: plain.discount ?? undefined,
    shipping: plain.shipping ?? undefined,
    shippingAddress: plain.shippingAddress ?? undefined,
    billingAddress: plain.billingAddress ?? undefined,
    payment: plain.payment,
    subscriptionIds: plain.subscriptionIds ?? [],
    fulfillmentErrors: plain.fulfillmentErrors ?? [],
    statusHistory: plain.statusHistory ?? [],
    paidAt: plain.paidAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

export const createMongoOrderRepository = (model: Model<OrderDocument>): OrderRepository => ({
  findMany: async (options: FindManyOrdersOptions): Promise<PaginatedResult<OrderEntity>> => {
    const { page, pageSize, status, userId } = options;
    const filter: QueryFilter<OrderDocument> = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const skip = (page - 1) * pageSize;
    const [docs, total] = await Promise.all([
      model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).exec(),
      model.countDocuments(filter).exec(),
    ]);

    return { items: docs.map(mapToOrderEntity), total, page, pageSize };
  },
  findById: async (id: string): Promise<OrderEntity | null> => {
    if (!isValidObjectId(id)) return null;
    const doc = await model.findById(id).exec();
    return doc ? mapToOrderEntity(doc) : null;
  },
  findByPaymentId: async (paymentId: string): Promise<OrderEntity | null> => {
    const doc = await model.findOne({ 'payment.paymentId': paymentId }).exec();
    return doc ? mapToOrderEntity(doc) : null;
  },
  findByInvoiceId: async (invoiceId: string): Promise<OrderEntity | null> => {
    const doc = await model.findOne({ 'payment.invoiceId': invoiceId }).exec();
    return doc ? mapToOrderEntity(doc) : null;
  },
  findPendingCreatedBefore: async (cutoff: Date): Promise<OrderEntity[]> => {
    const docs = await model.find({ status: 'pending', createdAt: { $lt: cutoff } }).exec();
    return docs.map(mapToOrderEntity);
  },
  countRedemptionsByUser: (userId: string, discountId: string): Promise<number> =>
    model
      .countDocuments({ userId, kind: 'checkout', 'discount.discountId': discountId, status: { $in: REDEEMED_STATUSES } })
      .exec(),
  create: async (input: CreateOrderInput): Promise<OrderEntity> => {
    const doc = await model.create(input);
    return mapToOrderEntity(doc);
  },
  update: async (id: string, input: UpdateOrderInput): Promise<OrderEntity | null> => {
    if (!isValidObjectId(id)) return null;
    const doc = await model.findByIdAndUpdate(id, { $set: input }, { new: true }).exec();
    return doc ? mapToOrderEntity(doc) : null;
  },
  transitionStatus: async (id: string, from: OrderStatus[], change: OrderStatusChange): Promise<OrderEntity | null> => {
    if (!isValidObjectId(id)) return null;
    const set: Record<string, unknown> = { status: change.status };
    if (change.status === 'paid') set['paidAt'] = change.at;
    const doc = await model
      .findOneAndUpdate({ _id: id, status: { $in: from } }, { $set: set, $push: { statusHistory: change } }, { new: true })
      .exec();
    return doc ? mapToOrderEntity(doc) : null;
  },
});
