import productsRouter from './routes/ecommerce/products.route';
import shippingMethodsRouter from './routes/ecommerce/shipping-methods.route';
import discountsRouter from './routes/ecommerce/discounts.route';
import cartRouter from './routes/ecommerce/cart.route';
import checkoutRouter from './routes/ecommerce/checkout.route';
import ordersRouter from './routes/ecommerce/orders.route';
import subscriptionsRouter from './routes/ecommerce/subscriptions.route';
import storeRouter from './routes/ecommerce/store.route';
// inithium:anchor:imports
  app.use(productsRouter);
  app.use(shippingMethodsRouter);
  app.use(discountsRouter);
  app.use(cartRouter);
  app.use(checkoutRouter);
  app.use(ordersRouter);
  app.use(subscriptionsRouter);
  app.use(storeRouter);
  // inithium:anchor:routes
