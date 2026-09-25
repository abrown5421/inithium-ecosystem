// Ecommerce data access is exposed as repository getters only - the rules around carts, orders,
// and subscriptions live in @inithium/ecommerce, which is the intended entry point.
export const getProductRepository = () => activeProvider.getProductRepository();
export const getCartRepository = () => activeProvider.getCartRepository();
export const getOrderRepository = () => activeProvider.getOrderRepository();
export const getDiscountRepository = () => activeProvider.getDiscountRepository();
export const getBillingSubscriptionRepository = () => activeProvider.getBillingSubscriptionRepository();
export const getShippingMethodRepository = () => activeProvider.getShippingMethodRepository();
export const getPaymentCustomerRepository = () => activeProvider.getPaymentCustomerRepository();
export const getPaymentEventRepository = () => activeProvider.getPaymentEventRepository();

// inithium:anchor:repositories
export { BILLING_INTERVALS } from './contracts/commerce.contract';
export type {
  BillingInterval,
  RecurringSchedule,
  ProductBilling,
  LineOptions,
  PostalAddress,
} from './contracts/commerce.contract';
export { PRODUCT_IMAGE_SOURCE_TYPES } from './contracts/product.contract';
export type {
  ProductEntity,
  ProductOption,
  ProductVariant,
  ProductImageSourceType,
  ProductSearchField,
  CreateProductInput,
  UpdateProductInput,
  FindManyProductsOptions,
  FindPublishedProductsOptions,
  ProductRepository,
} from './contracts/product.contract';
export type { CartEntity, CartLine, SaveCartInput, CartRepository } from './contracts/cart.contract';
export { ORDER_STATUSES, ORDER_KINDS } from './contracts/order.contract';
export type {
  OrderEntity,
  OrderLine,
  OrderLineBilling,
  OrderTotals,
  OrderDiscountSnapshot,
  OrderShippingSnapshot,
  OrderPaymentInfo,
  OrderStatus,
  OrderStatusChange,
  OrderKind,
  CreateOrderInput,
  UpdateOrderInput,
  FindManyOrdersOptions,
  OrderRepository,
} from './contracts/order.contract';
export { DISCOUNT_KINDS, DISCOUNT_SCOPES, DISCOUNT_BILLING_TARGETS, DISCOUNT_DURATIONS } from './contracts/discount.contract';
export type {
  DiscountEntity,
  DiscountKind,
  DiscountScope,
  DiscountBillingTarget,
  DiscountDuration,
  DiscountTarget,
  DiscountSearchField,
  CreateDiscountInput,
  UpdateDiscountInput,
  FindManyDiscountsOptions,
  DiscountRepository,
} from './contracts/discount.contract';
export { BILLING_SUBSCRIPTION_STATUSES, BILLING_SUBSCRIPTION_LINE_STATUSES } from './contracts/billing-subscription.contract';
export type {
  BillingSubscriptionEntity,
  BillingSubscriptionLine,
  BillingSubscriptionStatus,
  BillingSubscriptionLineStatus,
  CreateBillingSubscriptionInput,
  UpdateBillingSubscriptionInput,
  FindManyBillingSubscriptionsOptions,
  BillingSubscriptionRepository,
} from './contracts/billing-subscription.contract';
export type {
  ShippingMethodEntity,
  CreateShippingMethodInput,
  UpdateShippingMethodInput,
  ShippingMethodRepository,
} from './contracts/shipping-method.contract';
export type {
  PaymentCustomerEntity,
  CreatePaymentCustomerInput,
  PaymentCustomerRepository,
} from './contracts/payment-customer.contract';
export type { PaymentEventEntity, PaymentEventRepository } from './contracts/payment-event.contract';
// inithium:anchor:type-exports
