import type { PaginatedResult } from './pagination.contract';
import type { LineOptions, PostalAddress, RecurringSchedule } from './commerce.contract';
import type { DiscountDuration, DiscountKind, DiscountScope } from './discount.contract';

// pending   - created at checkout, stock/seats reserved, payment not yet confirmed
// paid      - payment captured; fulfillment hooks have run
// fulfilled / cancelled / refunded - admin-recorded outcomes only; no money moves automatically
// failed    - payment never completed; reservations released
export const ORDER_STATUSES = ['pending', 'paid', 'fulfilled', 'cancelled', 'refunded', 'failed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// checkout - placed by the user through the cart; renewal - created by a subscription's recurring charge
export const ORDER_KINDS = ['checkout', 'renewal'] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

export type OrderLineBilling =
  | { type: 'one_time' }
  | ({
      type: 'recurring';
      // Per-unit amount of every renewal after the first charge (the first charge is
      // OrderLine.unitAmountCents, which an adapter may set differently, e.g. a prorated month).
      recurringUnitAmountCents: number;
      // Per-period discount carried onto renewals by the promo code's duration (0 for 'once').
      recurringDiscountCents: number;
      firstBillingAt: Date;
      endsAt?: Date;
    } & RecurringSchedule);

// A frozen snapshot - editing or deleting the product/class afterwards never changes history.
export interface OrderLine {
  id: string;
  cartLineId?: string;
  sourceType: string;
  sourceId: string;
  variantId?: string;
  options: LineOptions;
  name: string;
  description?: string;
  imageUrl?: string;
  href?: string;
  categories: string[];
  taxCode?: string;
  requiresShipping: boolean;
  unitAmountCents: number;
  quantity: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  billing: OrderLineBilling;
  // True once the owning source's reserve() hook claimed stock/seats for this line, so a failed
  // or abandoned checkout knows exactly what to release.
  reserved: boolean;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface OrderDiscountSnapshot {
  discountId: string;
  code: string;
  kind: DiscountKind;
  scope: DiscountScope;
  value: number;
  duration: DiscountDuration;
  durationInMonths?: number;
}

export interface OrderShippingSnapshot {
  methodId: string;
  name: string;
  amountCents: number;
}

export interface OrderPaymentInfo {
  provider: string;
  paymentId?: string;
  paymentMethodId?: string;
  invoiceId?: string;
  taxCalculationId?: string;
}

export interface OrderStatusChange {
  status: OrderStatus;
  at: Date;
  actorUserId?: string;
  note?: string;
}

export interface OrderEntity {
  id: string;
  userId: string; // FK -> UserEntity.id
  kind: OrderKind;
  status: OrderStatus;
  currency: string;
  lines: OrderLine[];
  totals: OrderTotals;
  discount?: OrderDiscountSnapshot;
  shipping?: OrderShippingSnapshot;
  shippingAddress?: PostalAddress;
  billingAddress?: PostalAddress;
  payment: OrderPaymentInfo;
  // checkout: every subscription this order started; renewal: the one subscription it renews.
  subscriptionIds: string[];
  // Post-payment steps that failed (tax commit, a subscription, a source's onPaid hook). The money
  // was taken, so these never fail the order - they're surfaced for an admin to resolve.
  fulfillmentErrors: string[];
  statusHistory: OrderStatusChange[];
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateOrderInput = Omit<OrderEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOrderInput = Partial<Omit<CreateOrderInput, 'userId' | 'kind' | 'status' | 'statusHistory'>>;

export interface FindManyOrdersOptions {
  page: number;
  pageSize: number;
  status?: OrderStatus;
  userId?: string;
}

export interface OrderRepository {
  findMany: (options: FindManyOrdersOptions) => Promise<PaginatedResult<OrderEntity>>;
  findById: (id: string) => Promise<OrderEntity | null>;
  findByPaymentId: (paymentId: string) => Promise<OrderEntity | null>;
  findByInvoiceId: (invoiceId: string) => Promise<OrderEntity | null>;
  findPendingCreatedBefore: (cutoff: Date) => Promise<OrderEntity[]>;
  countRedemptionsByUser: (userId: string, discountId: string) => Promise<number>;
  create: (input: CreateOrderInput) => Promise<OrderEntity>;
  update: (id: string, input: UpdateOrderInput) => Promise<OrderEntity | null>;
  // Compare-and-set on status - returns null when the order isn't currently in one of `from`, so
  // concurrent finalizers (the checkout request and the payment webhook) can't both win.
  transitionStatus: (id: string, from: OrderStatus[], change: OrderStatusChange) => Promise<OrderEntity | null>;
}
