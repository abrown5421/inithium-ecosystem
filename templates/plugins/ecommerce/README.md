# ecommerce plugin

Products (with variants and stock), a per-user cart, promo codes, shipping methods, and a Stripe-backed checkout supporting one-time and recurring (subscription) billing. Any collection can be made purchasable through the same cart and checkout by writing a `PurchasableSource` adapter.

## What gets installed

| Where | What |
|---|---|
| `libs/db` | Contracts, schemas, and Mongo repositories: `products`, `carts`, `orders`, `discounts`, `billingsubscriptions`, `shippingmethods`, `paymentcustomers`, `paymentevents`. Also the `ecommerce.currency` setting seed (`usd`). |
| `libs/payments` (new) | Provider-agnostic `PaymentProvider` and `TaxProvider` contracts, with Stripe and Stripe Tax implementations. To swap processors, add `providers/<name>/` and repoint `active-provider.ts`. |
| `libs/ecommerce` (new) | The domain logic: the purchasable source registry, pure pricing and discount math, and the cart, checkout, subscription, and webhook services. |
| `libs/api-core/src/routes/ecommerce` | Thin HTTP routes (listed below). |
| `libs/api-client` | RTK Query endpoints (`ecommerce.endpoints.ts`) and pure storefront helpers (`ecommerce/storefront.ts`: money formatting, variant selection, API error parsing). |
| `apps/web` | Shop (`/products`), Cart (`/cart`), Checkout (`/checkout`), and Order (`/orders/:id`) pages, a profile **Orders** tab, and a navbar cart button. |
| `apps/api/src/main.ts` | Mounts the payment webhook at the `pre-body-parser` anchor. |
| Permissions | `ecommerce:manage-products`, `:manage-orders`, `:manage-discounts`, `:manage-shipping`, `:record-sales`. Admin-only by default. |
| `libs/cms` (with the cms plugin) | Products, Orders, Discounts, Shipping, and Subscriptions modules, plus a Sales dashboard widget. |

With **storage** installed, `products.route.ts` is swapped for a variant that also deletes cloud product images. With **cms** installed, the four capabilities appear in the Permissions module.

## Setup

1. **Environment variables** (`apps/api/.env`):
   ```
   STRIPE_SECRET_KEY=sk_live_or_test_...
   STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
   The web app gets the publishable key and currency from `GET /api/store/config`, so it needs no env var of its own.
2. **Stripe Tax** must be activated in the Stripe dashboard, with the business's origin address and tax registrations. Tax calculations fail without it. For a sandbox, or a store that doesn't collect sales tax, set `STRIPE_TAX_ENABLED=false` instead: no tax is calculated at checkout or on renewals, and nothing needs configuring in Stripe.
3. **Webhook endpoint:** `POST {API_PUBLIC_URL}/api/payments/webhook`, subscribed to:
   `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
   For local testing: `stripe listen --forward-to localhost:3000/api/payments/webhook`.
4. **Workspaces created before this plugin existed** need core's two `main.ts` anchors added by hand before `inithium add ecommerce`:
   - `// inithium:anchor:imports` after the last import
   - `// inithium:anchor:pre-body-parser` on the line directly above `app.use(express.json());`

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/products?page=&pageSize=&category=&search=`, `GET /api/products/categories`, `GET /api/products/slug/:slug` | public | Published catalog (paginated), category filter choices, one product |
| `GET /api/store/config` | public | Store currency and the payment provider's public client config |
| `GET /api/products/admin`, `GET/POST/PUT/DELETE /api/products[/admin]/:id`, `POST /api/products/upload` | manage-products | Product admin and local image upload |
| `GET /api/shipping-methods` | public | Active shipping methods |
| `GET /api/shipping-methods/admin`, `POST/PUT/DELETE /api/shipping-methods[/:id]` | manage-shipping | Shipping admin |
| `GET/POST/PUT/DELETE /api/discounts[/:id]` | manage-discounts | Promo code admin |
| `GET /api/cart`, `POST /api/cart/lines`, `PATCH/DELETE /api/cart/lines/:lineId`, `DELETE /api/cart` | user | Cart. Every response is the full priced `CartView`. |
| `PUT /api/cart/discount`, `DELETE /api/cart/discount` | user | Apply a code (400 with the reason if it doesn't apply) or remove it |
| `POST /api/checkout/quote` | user | Priced and taxed preview for a shipping choice and addresses |
| `POST /api/checkout` | user | Place the order and charge |
| `POST /api/checkout/orders/:orderId/confirm` | user | Resume after a 3-D Secure step |
| `GET /api/orders/mine[/:id]` | user | Purchase history |
| `GET /api/orders/admin?status=&kind=&userId=&from=&to=`, `GET /api/orders/admin/:id` | manage-orders | All orders (filterable), one order with the purchaser resolved |
| `PATCH /api/orders/admin/:id/status` | manage-orders | Record fulfilled/cancelled/refunded (no money moves) |
| `PATCH /api/orders/admin/:id` | manage-orders | Internal notes and tracking number |
| `GET /api/orders/admin/stats?period=week\|month\|year&tz=` | manage-orders | Sales buckets and totals for the dashboard widget |
| `GET /api/orders/admin/export.csv?from=&to=&status=` | manage-orders | One CSV row per order, for accounting |
| `GET /api/orders/admin/customers?search=`, `POST /api/orders/admin/quote`, `POST /api/orders/admin` | record-sales | Find a customer, price an order, and record an order on their behalf |
| `GET /api/products/admin/categories` | manage-products | Every category in use, including drafts |
| `GET /api/discounts/source-types` | manage-discounts | Registered purchasable item types, for targeting codes |
| `GET /api/subscriptions/mine`, `DELETE /api/subscriptions/mine/:id/lines/:lineId` | user | View subscriptions and stop billing one line |
| `GET /api/subscriptions/admin`, `POST /api/subscriptions/admin/:id/cancel` | manage-orders | All subscriptions, and admin cancel |

## Checkout contract (for the frontend)

1. Show `POST /api/checkout/quote` with `{ billingAddress, shippingMethodId?, shippingAddress? }`. A shipping method is required only when a line `requiresShipping`, and an address only when that method `requiresAddress`.
2. Collect payment with Stripe's Payment Element in deferred-intent mode. Create a **ConfirmationToken** client-side. When the quote has `recurring` entries, set `setup_future_usage: 'off_session'` so renewals can be charged.
3. `POST /api/checkout` with the same details plus `{ paymentToken, expectedTotalCents: quote.totalCents }`:
   - **201 `paid`**: done.
   - **202 `requires_action`**: call `stripe.handleNextAction({ clientSecret })`, then `POST /api/checkout/orders/:orderId/confirm`.
   - **202 `processing`**: the webhook completes the order.
   - **409**: the total changed (price, stock, or code). `details.quote` holds the new quote to show before retrying.

Redirect-based payment methods are disabled (`allow_redirects: 'never'`). Cards and wallets are supported.

## Storefront (web)

- **Shop** is a paginated grid with category and search filters. Clicking a card sets `?item=<slug>`, which opens the product dialog (variant pickers, stock, quantity, add to cart). Because the dialog is driven by the URL, cart and order line titles link straight to it. Other sources set their own `href` on resolved lines.
- **Cart** lets the shopper change quantities, remove lines, empty the cart, and apply a promo code. It shows subtotal and discount; shipping and tax say "calculated at checkout". Unavailable lines block checkout until removed.
- **Checkout** has a shipping method and address (only when a line ships), a billing address, and the payment fields. It re-quotes as the form changes, and the summary is read-only. It handles all four outcomes: paid, 3-D Secure, processing, and 409 "total changed".
- **Payment fields** sit behind `pages/ecommerce/payment/payment-fields.contract.ts`. `PaymentFields.tsx` picks the implementation from the API's configured provider. Stripe's Payment Element is themed from the live `--ui-*` tokens, including dark mode, and limited to cards and wallets.
- **Signed-out visitors** can browse. Cart, checkout, and order pages show a sign-in prompt, and "Add to cart" sends them to `/login?redirect=...` so they come back to where they were.
- The **cart and order caches are keyed by user id**, since logging out doesn't reset RTK Query's cache.
- The **navbar cart button** is a `*.navbar-action.tsx` file in core's navbar-action registry (`apps/web/src/app/navbarActions`).

## CMS

Installed only when the cms plugin is present, and removed again if it's uninstalled. Each module is gated by its own capability.

- **Products** (`manage-products`): list with search, a publish toggle, and a stock summary. The editor covers details, categories, price, one-time or recurring billing, "ships" and tax code, the image, and options and variants. **Generate variants** builds every Size × Color combination; each existing variant keeps its id, so items already in carts stay valid. With the storage plugin, the image field uses `MediaField` (cloud upload with a square crop). Without it, the field takes a URL or a local upload. Only `ProductImageField.tsx` differs between the two.
- **Orders** (`manage-orders`): filters for status, type (online, renewal, staff-recorded) and date range, plus a CSV export. The detail view shows the customer, payment reference, "needs attention" follow-up errors, lines, totals, addresses, status actions (fulfilled / cancelled / refunded, each with a note), internal notes and tracking number, and the status history. Orders are never deleted or edited.
  - **Create Order** also needs `record-sales`. It records a purchase the customer already paid for outside the store. The order is created paid, with no charge and no tax. Stock, promo codes, and each item's `onPaid` hook (e.g. an enrollment) run as they would at checkout. Recurring items are blocked, since there's no saved card to bill renewals. The built-in item picker offers store products; other sources can be recorded through `POST /api/orders/admin`.
- **Discounts** (`manage-discounts`): code (with a generator), percent or fixed amount, whole order or specific items (by item type, category, or product), which billing it applies to and how long it discounts subscriptions, start and end dates, minimums, usage limits, and a status badge (Active / Scheduled / Expired / Used up / Inactive).
- **Shipping** (`manage-shipping`) and **Subscriptions** (`manage-orders`): full CRUD for shipping methods, and a subscription list with cancellation.
- **Sales widget** (`manage-orders`): Week / Month / Year revenue chart in the viewer's timezone, with revenue, orders and "to fulfill" tiles compared against the previous period. Revenue means paid and not cancelled or refunded, and includes renewals and staff-recorded orders.

**Clearing fields:** the product, discount, and shipping-method `PUT` routes treat `null` as "clear this optional field" (e.g. remove an end date or image). An omitted field is left unchanged.

## How billing works

- **Money** is always integer cents in the one install-wide currency.
- **The first period of every recurring line is paid in the checkout charge.** A checkout is always one charge, whatever the mix of one-time and recurring lines, so it either fully succeeds or charges nothing. A provider subscription is then created per distinct renewal schedule, with its first automatic charge at `firstBillingAt`. Stripe models this as a trial, so turn off Stripe's trial-ending reminder emails in the dashboard.
- **Tax:** the checkout charge is taxed through `TaxProvider` (Stripe Tax) against the shipping address if goods ship, otherwise the billing address. Renewals are taxed by Stripe at billing time (`automatic_tax`).
- **Promo codes:** one per cart, never stacked with each other. Source-level pricing (e.g. a pay-for-the-year tier) is already in the adapter's `unitAmountCents`, so it naturally stacks with a code. `duration` controls renewals: `once` covers the checkout charge only, `repeating` covers N months from checkout, `forever` covers every renewal.
- **Stock and seats** are claimed atomically right before payment and released if the payment fails. An abandoned checkout (pending for 30 minutes, e.g. an unfinished 3-D Secure step) is swept lazily the next time anyone checks out: its payment is voided and its reservations released.
- **Refunds:** an admin only *records* `refunded`, `cancelled`, or `fulfilled`. No money moves. Each workspace decides its own refund process.
- **Stopping a subscription line** (customer route, admin cancel, or `cancelSubscriptionLinesForSource`) stops future billing immediately, with no proration or credit. The paid period is kept, and `onSubscriptionLineEnded` receives `paidThrough` so the source decides when access ends.
- **Post-payment failures** (tax record, subscription creation, a source's `onPaid`) never fail a paid order. They're listed in `order.fulfillmentErrors` for an admin.

## Making another collection purchasable

Implement `PurchasableSource` from `@inithium/ecommerce` and add it to `libs/ecommerce/src/purchasables/registry.ts` (above the `sources` anchor). A class adapter for a studio, for example:

```ts
import type { PurchasableSource } from './purchasable.contract';

const classPurchasable: PurchasableSource = {
  sourceType: 'class',
  resolve: async (ref, ctx) => {
    // Load the class; return null if it's gone or unpublished.
    // ref.options carries whatever the storefront sent, e.g. { childId, tier: 'monthly' | 'semester' | 'year' }.
    // Return unitAmountCents with the tier's pricing already applied, and billing:
    //   monthly  -> { type: 'recurring', interval: 'month', intervalCount: 1, nextBillingAt, endsAt, initialAmountCents? }
    //   semester -> { type: 'one_time' }
  },
  validate: async (ref, resolved, ctx) => ({ ok: true }), // child belongs to ctx.userId, registration open, not enrolled...
  reserve: async (ref) => true,                          // atomically claim a seat (enrolled < capacity)
  release: async (ref) => {},                            // give the seat back
  onPaid: async (line, order) => {},                     // add the child's registration
  onSubscriptionLineEnded: async (line, sub, paidThrough) => {}, // drop the registration at paidThrough
};
export default classPurchasable;
```

A workspace's own "drop class" flow stops billing with:

```ts
import { cancelSubscriptionLinesForSource } from '@inithium/ecommerce';
await cancelSubscriptionLinesForSource({ userId, sourceType: 'class', sourceId: classId, matchOptions: { childId } });
```

`libs/ecommerce` is plugin-owned, so re-running `inithium add ecommerce` restores its `registry.ts`. Re-add your registry line afterwards. `inithium remove ecommerce` deletes the whole package, including any adapters kept inside it.
