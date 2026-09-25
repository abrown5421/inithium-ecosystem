import { z } from 'zod';
import {
  BILLING_INTERVALS,
  DISCOUNT_BILLING_TARGETS,
  DISCOUNT_DURATIONS,
  DISCOUNT_KINDS,
  DISCOUNT_SCOPES,
  PRODUCT_IMAGE_SOURCE_TYPES,
} from '@inithium/db';

type IssueContext = { addIssue: (issue: { code: 'custom'; path: (string | number)[]; message: string }) => void };

const cents = z.number().int().min(0);
const lineOptions = z.record(z.string(), z.string().max(200));

export const postalAddressSchema = z.object({
  name: z.string().max(200).optional(),
  line1: z.string().min(1, 'Address line 1 is required').max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().length(2, 'Country must be a 2-letter ISO code').transform((value) => value.toUpperCase()),
});

// ---- Products ----

const billingSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('one_time') }),
  z.object({ type: z.literal('recurring'), interval: z.enum(BILLING_INTERVALS), intervalCount: z.number().int().min(1).max(12) }),
]);

const variantSchema = z.object({
  // Present for existing variants (kept stable so cart lines stay valid), omitted for new ones.
  id: z.string().min(1).optional(),
  sku: z.string().max(100).optional(),
  optionValues: lineOptions.default({}),
  priceCents: cents.optional(),
  stockQuantity: cents.nullable().default(null),
  isActive: z.boolean().default(true),
});

const productOptionsSchema = z.array(
  z.object({ name: z.string().min(1).max(50), values: z.array(z.string().min(1).max(100)).min(1) }),
);

const productShape = {
  name: z.string().min(1, 'Name is required').max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and single hyphens'),
  description: z.string().max(10000).optional(),
  categories: z.array(z.string().min(1).max(100)).default([]),
  imageUrl: z.string().min(1).optional(),
  imageSourceType: z.enum(PRODUCT_IMAGE_SOURCE_TYPES).optional(),
  imageAssetId: z.string().min(1).optional(),
  imageStorageKey: z.string().min(1).optional(),
  basePriceCents: cents,
  taxCode: z.string().max(50).optional(),
  requiresShipping: z.boolean().default(false),
  billing: billingSchema.default({ type: 'one_time' }),
  options: productOptionsSchema.default([]),
  variants: z.array(variantSchema).max(200).optional(),
  isPublished: z.boolean().default(false),
};

// Same cross-field image rule as the staff/gallery schemas: which of assetId/storageKey is
// required depends on imageSourceType.
const requireImageSourceFields = (
  data: { imageSourceType?: string; imageUrl?: string; imageAssetId?: string; imageStorageKey?: string },
  ctx: IssueContext,
) => {
  if (!data.imageSourceType) return;
  if (!data.imageUrl) ctx.addIssue({ code: 'custom', path: ['imageUrl'], message: 'imageUrl is required when imageSourceType is set' });
  if (data.imageSourceType === 'cloud' && !data.imageAssetId) {
    ctx.addIssue({ code: 'custom', path: ['imageAssetId'], message: 'imageAssetId is required for imageSourceType "cloud"' });
  }
  if (data.imageSourceType === 'local' && !data.imageStorageKey) {
    ctx.addIssue({ code: 'custom', path: ['imageStorageKey'], message: 'imageStorageKey is required for imageSourceType "local"' });
  }
};

// Every variant may only use declared option names/values, so a variant can't reference an option
// the storefront has no way to present.
const requireVariantsMatchOptions = (
  data: { options?: { name: string; values: string[] }[]; variants?: { optionValues: Record<string, string> }[] },
  ctx: IssueContext,
) => {
  if (!data.options || !data.variants) return;
  const allowed = new Map(data.options.map((option) => [option.name, new Set(option.values)]));
  data.variants.forEach((variant, index) => {
    Object.entries(variant.optionValues).forEach(([name, value]) => {
      if (!allowed.get(name)?.has(value)) {
        ctx.addIssue({ code: 'custom', path: ['variants', index, 'optionValues', name], message: `"${value}" is not a value of option "${name}"` });
      }
    });
  });
};

const refineProduct = (data: Parameters<typeof requireImageSourceFields>[0] & Parameters<typeof requireVariantsMatchOptions>[0], ctx: IssueContext) => {
  requireImageSourceFields(data, ctx);
  requireVariantsMatchOptions(data, ctx);
};

export const createProductSchema = z.object(productShape).superRefine(refineProduct);
export type CreateProductRequestBody = z.infer<typeof createProductSchema>;

// Partial updates must not re-apply creation defaults (e.g. silently unpublishing), so the update
// shape strips every .default().
export const updateProductSchema = z
  .object({
    ...productShape,
    categories: z.array(z.string().min(1).max(100)),
    requiresShipping: z.boolean(),
    billing: billingSchema,
    options: productOptionsSchema,
    isPublished: z.boolean(),
  })
  .partial()
  .superRefine(refineProduct);
export type UpdateProductRequestBody = z.infer<typeof updateProductSchema>;

// ---- Discounts ----

const discountShape = {
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Codes may only contain letters, numbers, hyphens, and underscores')
    .transform((value) => value.toUpperCase()),
  description: z.string().max(500).optional(),
  kind: z.enum(DISCOUNT_KINDS),
  value: z.number().int().min(1),
  scope: z.enum(DISCOUNT_SCOPES),
  target: z
    .object({
      sourceTypes: z.array(z.string().min(1)).default([]),
      sourceIds: z.array(z.string().min(1)).default([]),
      categories: z.array(z.string().min(1)).default([]),
    })
    .default({ sourceTypes: [], sourceIds: [], categories: [] }),
  appliesToBilling: z.enum(DISCOUNT_BILLING_TARGETS).default('all'),
  duration: z.enum(DISCOUNT_DURATIONS).default('once'),
  durationInMonths: z.number().int().min(1).max(120).optional(),
  minSubtotalCents: cents.optional(),
  minQuantity: z.number().int().min(1).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  maxRedemptionsPerUser: z.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
};

const refineDiscount = (
  data: { kind?: string; value?: number; duration?: string; durationInMonths?: number; startsAt?: Date; endsAt?: Date },
  ctx: IssueContext,
) => {
  if (data.kind === 'percent' && data.value !== undefined && data.value > 100) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percent discount cannot exceed 100' });
  }
  if (data.duration === 'repeating' && !data.durationInMonths) {
    ctx.addIssue({ code: 'custom', path: ['durationInMonths'], message: 'durationInMonths is required for a repeating discount' });
  }
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'endsAt must be after startsAt' });
  }
};

export const createDiscountSchema = z.object(discountShape).superRefine(refineDiscount);
export type CreateDiscountRequestBody = z.infer<typeof createDiscountSchema>;

export const updateDiscountSchema = z
  .object({
    ...discountShape,
    target: z.object({ sourceTypes: z.array(z.string().min(1)), sourceIds: z.array(z.string().min(1)), categories: z.array(z.string().min(1)) }),
    appliesToBilling: z.enum(DISCOUNT_BILLING_TARGETS),
    duration: z.enum(DISCOUNT_DURATIONS),
    isActive: z.boolean(),
  })
  .partial()
  .superRefine(refineDiscount);
export type UpdateDiscountRequestBody = z.infer<typeof updateDiscountSchema>;

// ---- Shipping methods ----

const shippingMethodShape = {
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  amountCents: cents,
  freeOverCents: cents.optional(),
  requiresAddress: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
};

export const createShippingMethodSchema = z.object(shippingMethodShape);
export const updateShippingMethodSchema = z
  .object({ ...shippingMethodShape, requiresAddress: z.boolean(), isActive: z.boolean(), sortOrder: z.number().int() })
  .partial();

// ---- Cart & checkout ----

export const addCartLineSchema = z.object({
  sourceType: z.string().min(1).max(50),
  sourceId: z.string().min(1).max(100),
  variantId: z.string().min(1).max(100).optional(),
  options: lineOptions.optional(),
  quantity: z.number().int().min(1).default(1),
});

export const updateCartLineSchema = z.object({ quantity: z.number().int().min(1) });

export const applyDiscountCodeSchema = z.object({ code: z.string().trim().min(1).max(40) });

export const checkoutDetailsSchema = z.object({
  shippingMethodId: z.string().min(1).optional(),
  shippingAddress: postalAddressSchema.optional(),
  billingAddress: postalAddressSchema,
});

export const placeOrderSchema = checkoutDetailsSchema.extend({
  paymentToken: z.string().min(1).optional(),
  expectedTotalCents: cents,
});

// ---- Orders ----

export const setOrderStatusSchema = z.object({
  status: z.enum(['fulfilled', 'cancelled', 'refunded']),
  note: z.string().max(1000).optional(),
});
