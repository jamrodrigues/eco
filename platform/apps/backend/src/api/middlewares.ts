import { authenticate, configureStoreSearch, defineMiddlewares } from '@medusajs/framework/http'
import { hyperlocalContext } from './middlewares/hyperlocal-context'
import { accessControlGuard } from './middlewares/access-control'

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ['GET', 'POST'],
      matcher: '/store/*',
      middlewares: [hyperlocalContext],
    },
    {
      method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      matcher: '/admin/*',
      middlewares: [accessControlGuard],
    },
    {
      method: ['POST'],
      matcher: '/store/carts/:id/link-customer',
      middlewares: [authenticate('customer', ['bearer'])],
    },
    {
      method: ['GET'],
      matcher: '/store/customers/me/coins',
      middlewares: [authenticate('customer', ['bearer'])],
    },
  ],
})
