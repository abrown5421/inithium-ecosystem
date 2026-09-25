import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from '@inithium/api-utils';
import { getOrderRepository } from '@inithium/db';
import type { CreateOrderInput, OrderEntity, OrderLine, OrderStatus } from '@inithium/db';
import { getPaymentProvider } from '@inithium/payments';
import type { PaymentResult } from '@inithium/payments';
import type { CheckoutQuote } from '../views';
import { failOrder, finalizeOrder, reserveOrderLines, sweepStalePendingOrders } from './order-lifecycle';
import { ensurePaymentCustomer } from './payment-customer';
import { prepareCheckout } from './prepare-checkout';
import type { CheckoutDetailsInput, PreparedCheckout } from './prepare-checkout';

export const quoteCheckout = async (userId: string, input: CheckoutDetailsInput): Promise<CheckoutQuote> =>
  (await prepareCheckout(userId, input)).quote;

export interface PlaceOrderInput extends CheckoutDetailsInput {
  // From the payment provider's frontend element; omitted only for a $0 order.
  paymentToken?: string;
  // The quote total the shopper agreed to - a mismatch means prices, stock, or the promo code
  // changed since they reviewed the order, and they must see the new total before paying.
  expectedTotalCents: number;
}

export type PlaceOrderResult =
  | { status: 'paid'; order: OrderEntity }
  // Settling asynchronously; the payment webhook completes the order.
  | { status: 'processing'; order: OrderEntity }
  // The shopper must finish a step (e.g. 3-D Secure) with clientSecret, then call confirmOrderPayment.
  | { status: 'requires_action'; order: OrderEntity; clientSecret: string };

const buildPendingOrder = (prepared: PreparedCheckout): CreateOrderInput => {
  const { priced, quote, discountState } = prepared;
  const lines = priced.lines.map((line): OrderLine => {
    const taxCents = prepared.taxByLineId.get(line.lineId) ?? 0;
    return {
      id: randomUUID(),
      cartLineId: line.lineId,
      sourceType: line.ref.sourceType,
      sourceId: line.ref.sourceId,
      ...(line.ref.variantId ? { variantId: line.ref.variantId } : {}),
      options: line.ref.options,
      name: line.resolved.name,
      ...(line.resolved.description ? { description: line.resolved.description } : {}),
      ...(line.resolved.imageUrl ? { imageUrl: line.resolved.imageUrl } : {}),
      ...(line.resolved.href ? { href: line.resolved.href } : {}),
      categories: line.resolved.categories,
      ...(line.resolved.taxCode ? { taxCode: line.resolved.taxCode } : {}),
      requiresShipping: line.resolved.requiresShipping,
      unitAmountCents: line.unitAmountCents,
      quantity: line.ref.quantity,
      subtotalCents: line.subtotalCents,
      discountCents: line.discountCents,
      taxCents,
      totalCents: line.subtotalCents - line.discountCents + taxCents,
      billing:
        line.schedule && line.recurring
          ? {
              type: 'recurring',
              interval: line.schedule.interval,
              intervalCount: line.schedule.intervalCount,
              recurringUnitAmountCents: line.recurring.unitAmountCents,
              recurringDiscountCents: line.recurring.discountCents,
              firstBillingAt: line.schedule.firstBillingAt,
              ...(line.schedule.endsAt ? { endsAt: line.schedule.endsAt } : {}),
            }
          : { type: 'one_time' },
      reserved: false,
    };
  });

  const discount = discountState?.applied ? discountState.discount : undefined;
  const now = new Date();

  return {
    userId: prepared.userId,
    kind: 'checkout',
    status: 'pending',
    currency: prepared.currency,
    lines,
    totals: {
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      shippingCents: quote.shippingCents,
      taxCents: quote.taxCents,
      totalCents: quote.totalCents,
    },
    ...(discount
      ? {
          discount: {
            discountId: discount.id,
            code: discount.code,
            kind: discount.kind,
            scope: discount.scope,
            value: discount.value,
            duration: discount.duration,
            ...(discount.durationInMonths ? { durationInMonths: discount.durationInMonths } : {}),
          },
        }
      : {}),
    ...(prepared.shippingMethod && quote.shippingMethod
      ? { shipping: { methodId: prepared.shippingMethod.id, name: prepared.shippingMethod.name, amountCents: quote.shippingCents } }
      : {}),
    ...(prepared.shippingAddress ? { shippingAddress: prepared.shippingAddress } : {}),
    billingAddress: prepared.billingAddress,
    payment: {
      provider: getPaymentProvider().name,
      ...(prepared.tax.calculationId ? { taxCalculationId: prepared.tax.calculationId } : {}),
    },
    subscriptionIds: [],
    fulfillmentErrors: [],
    statusHistory: [{ status: 'pending', at: now }],
  };
};

const settlePayment = async (order: OrderEntity, result: PaymentResult): Promise<PlaceOrderResult> => {
  switch (result.status) {
    case 'succeeded': {
      const paid = await finalizeOrder(order.id, result.paymentMethodId);
      return { status: 'paid', order: paid ?? order };
    }
    case 'requires_action':
      if (!result.clientSecret) throw ConflictError('The payment needs another step but no confirmation details were returned');
      return { status: 'requires_action', order, clientSecret: result.clientSecret };
    case 'processing':
      return { status: 'processing', order };
    case 'failed':
    default:
      await failOrder(order.id, result.failureReason ?? 'Payment failed');
      throw ValidationError(result.failureReason ?? 'Your payment could not be completed.');
  }
};

export const placeOrder = async (userId: string, input: PlaceOrderInput): Promise<PlaceOrderResult> => {
  await sweepStalePendingOrders();

  const prepared = await prepareCheckout(userId, input);
  const { quote, priced } = prepared;
  if (quote.totalCents !== input.expectedTotalCents) {
    throw ConflictError('Your order total changed. Please review it before paying.', { quote });
  }
  // Renewals are charged to the payment method saved by today's charge, so a subscription can't
  // start from a fully discounted $0 checkout.
  if (quote.totalCents === 0 && priced.hasRecurring) {
    throw ValidationError('An order that starts a subscription must include a payment today.');
  }
  if (quote.totalCents > 0 && !input.paymentToken) {
    throw ValidationError('Payment details are required');
  }

  const orders = getOrderRepository();
  const order = await reserveOrderLines(await orders.create(buildPendingOrder(prepared)));

  if (quote.totalCents === 0) {
    return { status: 'paid', order: (await finalizeOrder(order.id)) ?? order };
  }

  const provider = getPaymentProvider();
  let result: PaymentResult;
  try {
    const customerId = await ensurePaymentCustomer(userId, prepared.billingAddress);
    result = await provider.charge({
      customerId,
      amountCents: quote.totalCents,
      currency: prepared.currency,
      paymentToken: input.paymentToken!,
      savePaymentMethod: priced.hasRecurring,
      description: `Order ${order.id}`,
      metadata: { orderId: order.id, userId },
      idempotencyKey: `order-${order.id}-charge`,
    });
  } catch (error) {
    await failOrder(order.id, 'Payment could not be processed');
    throw error;
  }

  const withPayment =
    (await orders.update(order.id, {
      payment: {
        ...order.payment,
        ...(result.paymentId ? { paymentId: result.paymentId } : {}),
        ...(result.paymentMethodId ? { paymentMethodId: result.paymentMethodId } : {}),
      },
    })) ?? order;
  return settlePayment(withPayment, result);
};

// Called by the frontend after the shopper completes a requires_action step.
export const confirmOrderPayment = async (userId: string, orderId: string): Promise<PlaceOrderResult> => {
  const order = await getOrderRepository().findById(orderId);
  if (!order || order.userId !== userId) throw NotFoundError('Order not found');

  if (order.status === 'failed') throw ValidationError('This order’s payment did not complete. Please check out again.');
  if (order.status !== 'pending') return { status: 'paid', order };
  if (!order.payment.paymentId) throw ConflictError('This order has no payment to confirm');

  return settlePayment(order, await getPaymentProvider().retrievePayment(order.payment.paymentId));
};

// Admin-recorded outcomes only - no money moves. How a refund is actually issued is left to each
// workspace (see the plugin README).
const ADMIN_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  fulfilled: ['paid'],
  cancelled: ['paid', 'fulfilled'],
  refunded: ['paid', 'fulfilled', 'cancelled'],
};

export const ADMIN_ORDER_STATUSES = Object.keys(ADMIN_STATUS_TRANSITIONS) as OrderStatus[];

export const setOrderStatusByAdmin = async (
  orderId: string,
  status: OrderStatus,
  actorUserId: string,
  note?: string,
): Promise<OrderEntity> => {
  const allowedFrom = ADMIN_STATUS_TRANSITIONS[status];
  if (!allowedFrom) throw ValidationError(`Orders cannot be manually set to "${status}"`);

  const order = await getOrderRepository().findById(orderId);
  if (!order) throw NotFoundError('Order not found');

  const updated = await getOrderRepository().transitionStatus(orderId, allowedFrom, {
    status,
    at: new Date(),
    actorUserId,
    ...(note ? { note } : {}),
  });
  if (!updated) throw ConflictError(`An order that is "${order.status}" cannot be marked "${status}"`);
  return updated;
};
