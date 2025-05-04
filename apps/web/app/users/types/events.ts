import User from '#users/models/user'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'user:registered': { user: User; message?: string }
    'user:created': { user: User; source?: string }
    'user:updated': { user: User; source?: string }
    'user:deleted': { userId: string }
    'logto:webhook': { event: string; data: Record<string, any> }
  }
}
