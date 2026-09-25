import { ValidationError } from '@inithium/api-utils';
import { getCartRepository, getShippingMethodRepository } from '@inithium/db';
import type { CartEntity, PostalAddress, ShippingMethodEntity } from '@inithium/db';
import { getTaxProvider } from '@inithium/payments';
import type { TaxCalculation } from '@inithium/payments';
import { evaluateCartDiscount, resolveCartLines } from '../cart/cart-lines';
import type { CartDiscountState } from '../cart/cart-lines';
import { scheduleKey } from '../pricing/billing';
import { priceCart } from '../pricing/pricing';
import type { PricedCart, PricedLine } from '../pricing/pricing';
import { getStoreCurrency } from '../settings';
import { toLineBillingView } from '../views';
import type { CheckoutQuote, RecurringChargeView } from '../views';

export interface CheckoutDetailsInput {
  shippingMethodId?: string;
  shippingAddress?: PostalAddress;
  billingAddress: PostalAddress;
}

// Everything checkout knows once the cart is priced and taxed - the same object backs the quote
// the shopper reviews and the order that is placed, so the two can never disagree.
export interface PreparedCheckout {
  userId: string;
  currency: string;
  cart: CartEntity;
  priced: PricedCart;
  discountState: CartDiscountState | null;
  shippingMethod: ShippingMethodEntity | null;
  shippingAddress?: PostalAddress;
  billingAddress: PostalAddress;
  tax: TaxCalculation;
  taxByLineId: Map<string, number>;
  quote: CheckoutQuote;
}

const resolveShipping = async (
  requiresShipping: boolean,
  input: CheckoutDetailsInput,
): Promise<{ method: ShippingMethodEntity | null; address?: PostalAddress }> => {
  if (!requiresShipping) return { method: null };
  if (!input.shippingMethodId) throw ValidationError('Choose a shipping method');

  const method = await getShippingMethodRepository().findById(input.shippingMethodId);
  if (!method || !method.isActive) throw ValidationError('That shipping method is not available');
  if (method.requiresAddress && !input.shippingAddress) throw ValidationError('A shipping address is required');

  return { method, ...(method.requiresAddress && input.shippingAddress ? { address: input.shippingAddress } : {}) };
};

const lineNetCents = (line: PricedLine): number => line.subtotalCents - line.discountCents;

const summarizeRecurring = (lines: PricedLine[]): RecurringChargeView[] => {
  const groups = lines.reduce<Map<string, PricedLine[]>>((acc, line) => {
    if (!line.schedule) return acc;
    const key = scheduleKey(line.schedule);
    return acc.set(key, [...(acc.get(key) ?? []), line]);
  }, new Map());

  return [...groups.values()].map((group) => {
    const schedule = group[0].schedule!;
    return {
      interval: schedule.interval,
      intervalCount: schedule.intervalCount,
      firstBillingAt: schedule.firstBillingAt,
      ...(schedule.endsAt ? { endsAt: schedule.endsAt } : {}),
      amountCents: group.reduce((sum, line) => sum + (line.recurring ? line.recurring.subtotalCents - line.recurring.discountCents : 0), 0),
      lineIds: group.map((line) => line.lineId),
    };
  });
};

export const prepareCheckout = async (userId: string, input: CheckoutDetailsInput): Promise<PreparedCheckout> => {
  const cart = await getCartRepository().findByUserId(userId);
  if (!cart || cart.lines.length === 0) throw ValidationError('Your cart is empty');

  const ctx = { userId, now: new Date() };
  const resolution = await resolveCartLines(cart.lines, ctx);
  if (resolution.unavailable.length > 0) {
    throw ValidationError('Some items in your cart are no longer available', {
      lines: resolution.unavailable.map(({ line, reason }) => ({ lineId: line.id, reason })),
    });
  }

  const currency = await getStoreCurrency();
  const discountState = await evaluateCartDiscount(cart.discountCode, resolution.available, ctx);
  const requiresShipping = resolution.available.some((line) => line.resolved.requiresShipping);
  const shipping = await resolveShipping(requiresShipping, input);
  const priced = priceCart(resolution.available, discountState?.allocation ?? new Map(), shipping.method);

  // Goods shipped to an address are taxed where they're delivered; everything else (services,
  // pickup) against the billing address.
  const tax = await getTaxProvider().calculate({
    currency,
    address: shipping.address ?? input.billingAddress,
    addressSource: shipping.address ? 'shipping' : 'billing',
    lines: priced.lines.map((line) => ({
      reference: line.lineId,
      amountCents: lineNetCents(line),
      quantity: line.ref.quantity,
      ...(line.resolved.taxCode ? { taxCode: line.resolved.taxCode } : {}),
    })),
    shippingCents: priced.shippingCents,
  });
  const taxByLineId = new Map(tax.lines.map((line) => [line.reference, line.taxCents]));

  const quote: CheckoutQuote = {
    currency,
    lines: priced.lines.map((line) => {
      const taxCents = taxByLineId.get(line.lineId) ?? 0;
      return {
        id: line.lineId,
        sourceType: line.ref.sourceType,
        sourceId: line.ref.sourceId,
        ...(line.ref.variantId ? { variantId: line.ref.variantId } : {}),
        options: line.ref.options,
        name: line.resolved.name,
        ...(line.resolved.imageUrl ? { imageUrl: line.resolved.imageUrl } : {}),
        ...(line.resolved.href ? { href: line.resolved.href } : {}),
        quantity: line.ref.quantity,
        unitAmountCents: line.unitAmountCents,
        subtotalCents: line.subtotalCents,
        discountCents: line.discountCents,
        taxCents,
        totalCents: lineNetCents(line) + taxCents,
        billing: toLineBillingView(line),
      };
    }),
    subtotalCents: priced.subtotalCents,
    discountCents: priced.discountCents,
    shippingCents: priced.shippingCents,
    taxCents: tax.totalTaxCents,
    totalCents: priced.subtotalCents - priced.discountCents + priced.shippingCents + tax.totalTaxCents,
    discount: discountState
      ? { code: discountState.code, applied: discountState.applied, ...(discountState.message ? { message: discountState.message } : {}) }
      : null,
    shippingMethod: shipping.method
      ? { id: shipping.method.id, name: shipping.method.name, amountCents: priced.shippingCents }
      : null,
    requiresShipping,
    recurring: summarizeRecurring(priced.lines),
  };

  return {
    userId,
    currency,
    cart,
    priced,
    discountState,
    shippingMethod: shipping.method,
    ...(shipping.address ? { shippingAddress: shipping.address } : {}),
    billingAddress: input.billingAddress,
    tax,
    taxByLineId,
    quote,
  };
};
