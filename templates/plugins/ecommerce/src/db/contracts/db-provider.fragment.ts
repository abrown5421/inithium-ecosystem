import { ProductRepository } from './product.contract';
import { CartRepository } from './cart.contract';
import { OrderRepository } from './order.contract';
import { DiscountRepository } from './discount.contract';
import { BillingSubscriptionRepository } from './billing-subscription.contract';
import { ShippingMethodRepository } from './shipping-method.contract';
import { PaymentCustomerRepository } from './payment-customer.contract';
import { PaymentEventRepository } from './payment-event.contract';
// inithium:anchor:imports
  getProductRepository: () => ProductRepository;
  getCartRepository: () => CartRepository;
  getOrderRepository: () => OrderRepository;
  getDiscountRepository: () => DiscountRepository;
  getBillingSubscriptionRepository: () => BillingSubscriptionRepository;
  getShippingMethodRepository: () => ShippingMethodRepository;
  getPaymentCustomerRepository: () => PaymentCustomerRepository;
  getPaymentEventRepository: () => PaymentEventRepository;
  // inithium:anchor:members
