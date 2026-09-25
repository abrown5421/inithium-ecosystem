import { ProductRepository } from '../../contracts/product.contract';
import { CartRepository } from '../../contracts/cart.contract';
import { OrderRepository } from '../../contracts/order.contract';
import { DiscountRepository } from '../../contracts/discount.contract';
import { BillingSubscriptionRepository } from '../../contracts/billing-subscription.contract';
import { ShippingMethodRepository } from '../../contracts/shipping-method.contract';
import { PaymentCustomerRepository } from '../../contracts/payment-customer.contract';
import { PaymentEventRepository } from '../../contracts/payment-event.contract';
import { createMongoProductRepository } from './product.repository';
import { createMongoCartRepository } from './cart.repository';
import { createMongoOrderRepository } from './order.repository';
import { createMongoDiscountRepository } from './discount.repository';
import { createMongoBillingSubscriptionRepository } from './billing-subscription.repository';
import { createMongoShippingMethodRepository } from './shipping-method.repository';
import { createMongoPaymentCustomerRepository } from './payment-customer.repository';
import { createMongoPaymentEventRepository } from './payment-event.repository';
import { ProductModel } from '../../schemas/product.schema';
import { CartModel } from '../../schemas/cart.schema';
import { OrderModel } from '../../schemas/order.schema';
import { DiscountModel } from '../../schemas/discount.schema';
import { BillingSubscriptionModel } from '../../schemas/billing-subscription.schema';
import { ShippingMethodModel } from '../../schemas/shipping-method.schema';
import { PaymentCustomerModel } from '../../schemas/payment-customer.schema';
import { PaymentEventModel } from '../../schemas/payment-event.schema';
// inithium:anchor:imports
const productRepository = createMongoProductRepository(ProductModel);
const cartRepository = createMongoCartRepository(CartModel);
const orderRepository = createMongoOrderRepository(OrderModel);
const discountRepository = createMongoDiscountRepository(DiscountModel);
const billingSubscriptionRepository = createMongoBillingSubscriptionRepository(BillingSubscriptionModel);
const shippingMethodRepository = createMongoShippingMethodRepository(ShippingMethodModel);
const paymentCustomerRepository = createMongoPaymentCustomerRepository(PaymentCustomerModel);
const paymentEventRepository = createMongoPaymentEventRepository(PaymentEventModel);
// inithium:anchor:repository-instances
  getProductRepository: (): ProductRepository => productRepository,
  getCartRepository: (): CartRepository => cartRepository,
  getOrderRepository: (): OrderRepository => orderRepository,
  getDiscountRepository: (): DiscountRepository => discountRepository,
  getBillingSubscriptionRepository: (): BillingSubscriptionRepository => billingSubscriptionRepository,
  getShippingMethodRepository: (): ShippingMethodRepository => shippingMethodRepository,
  getPaymentCustomerRepository: (): PaymentCustomerRepository => paymentCustomerRepository,
  getPaymentEventRepository: (): PaymentEventRepository => paymentEventRepository,
  // inithium:anchor:members
