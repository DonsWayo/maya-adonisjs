import type { ErrorEvent } from '#error/models/error_event'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'error:created': { error: ErrorEvent }
    'error:updated': { error: ErrorEvent }
    'error:deleted': { errorId: string }
  }
}
