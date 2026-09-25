"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGetMyOrderQuery = exports.useListMyOrdersQuery = exports.useConfirmOrderPaymentMutation = exports.usePlaceOrderMutation = exports.useQuoteCheckoutMutation = exports.useRemoveCartDiscountCodeMutation = exports.useApplyCartDiscountCodeMutation = exports.useClearCartMutation = exports.useRemoveCartLineMutation = exports.useUpdateCartLineQuantityMutation = exports.useAddCartLineMutation = exports.useGetCartQuery = exports.useListShippingMethodsQuery = exports.useGetProductBySlugQuery = exports.useListProductCategoriesQuery = exports.useListProductsQuery = exports.useGetStoreConfigQuery = exports.ecommerceApi = void 0;
const baseApi_1 = require("../baseApi");
const buildPaginatedList = (response) => ({
    items: response.data,
    page: response.meta?.['page'] ?? 1,
    pageSize: response.meta?.['pageSize'] ?? response.data.length,
    total: response.meta?.['total'] ?? response.data.length,
    totalPages: response.meta?.['totalPages'] ?? 1,
});
const unwrap = (response) => response.data;
exports.ecommerceApi = baseApi_1.baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getStoreConfig: builder.query({
            query: () => '/api/store/config',
            transformResponse: (unwrap),
        }),
        listProducts: builder.query({
            query: ({ page, pageSize, category, search }) => {
                const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
                if (category)
                    params.set('category', category);
                if (search)
                    params.set('search', search);
                return `/api/products?${params.toString()}`;
            },
            transformResponse: (buildPaginatedList),
            providesTags: ['Product'],
        }),
        listProductCategories: builder.query({
            query: () => '/api/products/categories',
            transformResponse: (unwrap),
            providesTags: ['Product'],
        }),
        getProductBySlug: builder.query({
            query: (slug) => `/api/products/slug/${encodeURIComponent(slug)}`,
            transformResponse: (unwrap),
            providesTags: ['Product'],
        }),
        listShippingMethods: builder.query({
            query: () => '/api/shipping-methods',
            transformResponse: (unwrap),
        }),
        getCart: builder.query({
            query: () => '/api/cart',
            transformResponse: (unwrap),
            providesTags: ['Cart'],
        }),
        addCartLine: builder.mutation({
            query: (body) => ({ url: '/api/cart/lines', method: 'POST', body }),
            transformResponse: (unwrap),
            onQueryStarted: (_arg, api) => syncCartCache(api),
        }),
        updateCartLineQuantity: builder.mutation({
            query: ({ lineId, quantity }) => ({ url: `/api/cart/lines/${lineId}`, method: 'PATCH', body: { quantity } }),
            transformResponse: (unwrap),
            onQueryStarted: (_arg, api) => syncCartCache(api),
        }),
        removeCartLine: builder.mutation({
            query: (lineId) => ({ url: `/api/cart/lines/${lineId}`, method: 'DELETE' }),
            transformResponse: (unwrap),
            onQueryStarted: (_arg, api) => syncCartCache(api),
        }),
        clearCart: builder.mutation({
            query: () => ({ url: '/api/cart', method: 'DELETE' }),
            transformResponse: (unwrap),
            onQueryStarted: (_arg, api) => syncCartCache(api),
        }),
        applyCartDiscountCode: builder.mutation({
            query: (code) => ({ url: '/api/cart/discount', method: 'PUT', body: { code } }),
            transformResponse: (unwrap),
            onQueryStarted: (_arg, api) => syncCartCache(api),
        }),
        removeCartDiscountCode: builder.mutation({
            query: () => ({ url: '/api/cart/discount', method: 'DELETE' }),
            transformResponse: (unwrap),
            onQueryStarted: (_arg, api) => syncCartCache(api),
        }),
        // A mutation rather than a query: it's an on-demand calculation for the current form state
        // (and costs a tax-provider call), not a cacheable resource.
        quoteCheckout: builder.mutation({
            query: (body) => ({ url: '/api/checkout/quote', method: 'POST', body }),
            transformResponse: (unwrap),
        }),
        placeOrder: builder.mutation({
            query: (body) => ({ url: '/api/checkout', method: 'POST', body }),
            transformResponse: (unwrap),
            invalidatesTags: ['Cart', 'Order', 'Product'],
        }),
        confirmOrderPayment: builder.mutation({
            query: (orderId) => ({ url: `/api/checkout/orders/${orderId}/confirm`, method: 'POST' }),
            transformResponse: (unwrap),
            invalidatesTags: ['Cart', 'Order', 'Product'],
        }),
        listMyOrders: builder.query({
            query: ({ page, pageSize }) => `/api/orders/mine?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`,
            transformResponse: (buildPaginatedList),
            providesTags: ['Order'],
        }),
        getMyOrder: builder.query({
            query: ({ orderId }) => `/api/orders/mine/${orderId}`,
            transformResponse: (unwrap),
            providesTags: ['Order'],
        }),
    }),
});
// Every cart mutation answers with the full, freshly priced cart, so the cached cart is replaced
// from that response instead of refetched.
async function syncCartCache({ dispatch, getState, queryFulfilled }) {
    try {
        const { data } = await queryFulfilled;
        const state = getState();
        for (const userId of exports.ecommerceApi.util.selectCachedArgsForQuery(state, 'getCart')) {
            dispatch(exports.ecommerceApi.util.upsertQueryData('getCart', userId, data));
        }
    }
    catch {
        // The mutation's own caller surfaces the error; the cached cart stays as it was.
    }
}
exports.useGetStoreConfigQuery = exports.ecommerceApi.useGetStoreConfigQuery, exports.useListProductsQuery = exports.ecommerceApi.useListProductsQuery, exports.useListProductCategoriesQuery = exports.ecommerceApi.useListProductCategoriesQuery, exports.useGetProductBySlugQuery = exports.ecommerceApi.useGetProductBySlugQuery, exports.useListShippingMethodsQuery = exports.ecommerceApi.useListShippingMethodsQuery, exports.useGetCartQuery = exports.ecommerceApi.useGetCartQuery, exports.useAddCartLineMutation = exports.ecommerceApi.useAddCartLineMutation, exports.useUpdateCartLineQuantityMutation = exports.ecommerceApi.useUpdateCartLineQuantityMutation, exports.useRemoveCartLineMutation = exports.ecommerceApi.useRemoveCartLineMutation, exports.useClearCartMutation = exports.ecommerceApi.useClearCartMutation, exports.useApplyCartDiscountCodeMutation = exports.ecommerceApi.useApplyCartDiscountCodeMutation, exports.useRemoveCartDiscountCodeMutation = exports.ecommerceApi.useRemoveCartDiscountCodeMutation, exports.useQuoteCheckoutMutation = exports.ecommerceApi.useQuoteCheckoutMutation, exports.usePlaceOrderMutation = exports.ecommerceApi.usePlaceOrderMutation, exports.useConfirmOrderPaymentMutation = exports.ecommerceApi.useConfirmOrderPaymentMutation, exports.useListMyOrdersQuery = exports.ecommerceApi.useListMyOrdersQuery, exports.useGetMyOrderQuery = exports.ecommerceApi.useGetMyOrderQuery;
