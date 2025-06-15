/*
|--------------------------------------------------------------------------
| Register middleware
|--------------------------------------------------------------------------
|
| This file is used to register middleware with the AdonisJS router.
| The middleware will be executed in the order they are registered.
|
*/

// Import middleware directly
import LogtoJwtMiddleware from '#auth/logto/middleware/jwt_middleware'
import LogtoPermissionMiddleware from '#auth/logto/middleware/permission_middleware'

// Export middleware for use in routes
export const logtoJwt = LogtoJwtMiddleware
export const logtoPermission = LogtoPermissionMiddleware

// The following is for reference only
/*
  // Named middleware
  {
    name: 'logtoJwt',
    middleware: () => import('#auth/logto/middleware/jwt_middleware'),
  },
  {
    name: 'logtoPermission',
    middleware: () => import('#auth/logto/middleware/permission_middleware'),
  },
])
*/
