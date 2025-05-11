/**
 * Custom error class for Logto API errors
 */
export class LogtoError extends Error {
  details: any

  constructor(message: string, details?: any) {
    super(message)
    this.name = 'LogtoError'
    this.details = details
  }
}
