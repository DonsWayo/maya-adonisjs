export class LogtoError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'LogtoError'
  }
}
