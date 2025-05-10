/**
 * DTO for error events
 */
export default interface ErrorEventDto {
  // Core event data
  id: string
  timestamp: string | Date
  projectId: string
  level: string
  message: string
  type: string
  platform: string
  sdk: {
    name: string
    version: string
  }
  
  // Optional event data
  release?: string
  environment: string
  serverName?: string
  transaction?: string
  
  // User information
  user?: {
    id?: string | number
    username?: string
    email?: string
    ip_address?: string
    [key: string]: any
  }
  
  // Request information
  request?: {
    url?: string
    method?: string
    headers?: Record<string, string>
    data?: any
    [key: string]: any
  }
  
  // Additional data
  tags?: Record<string, string>
  extra?: Record<string, any>
  
  // Exception information
  exception?: {
    values: Array<{
      type: string
      value: string
      module?: string
      stacktrace?: {
        frames: Array<{
          filename: string
          function?: string
          module?: string
          lineno?: number
          colno?: number
          in_app?: boolean
          [key: string]: any
        }>
      }
      [key: string]: any
    }>
  }
  
  // Breadcrumbs for event tracing
  breadcrumbs?: Array<{
    timestamp: string | number
    type: string
    category?: string
    level?: string
    message?: string
    data?: Record<string, any>
  }>
  
  // Context information (device, os, browser, etc.)
  contexts?: Record<string, any>
  
  // Fingerprint for grouping
  fingerprint?: string[]
}
