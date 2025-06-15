// Using MainAppUser type since monitoring app doesn't have local users
type MainAppUser = {
  id: string | number
  email: string
  name: string
  [key: string]: any
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'auth:forgot_password': { user: MainAppUser; token: string }
  }
}
