/**
 * Error event types and interfaces
 */

// Base error event interface
export interface ErrorEvent {
  id: string
  projectId: string
  message: string
  level: string
  environment: string
  timestamp: string
  fingerprint: string
  stacktrace?: string
  browser?: string
  os?: string
  url?: string
  ip?: string
  userAgent?: string
  userId?: string
  username?: string
  metadata?: Record<string, any>
  resolved: boolean
  resolvedAt?: string
  resolvedBy?: string
}

// Error event statistics
export interface ErrorStats {
  totalCount: number
  todayCount: number
  resolvedCount: number
  byLevel: {
    error: number
    warning: number
    info: number
    critical: number
  }
  byEnvironment: Record<string, number>
}

// Error event filter options
export interface ErrorFilters {
  search?: string
  level?: string
  environment?: string
  startDate?: string
  endDate?: string
  resolved?: boolean
  projectId?: string
}
