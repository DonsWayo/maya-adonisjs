/**
 * ErrorEvent interface representing the error_events table in ClickHouse
 */
export interface ErrorEvent {
  // Core event identifiers
  id: string
  timestamp: Date
  received_at?: Date
  projectId: string

  // Error classification
  level: string
  message: string
  type: string
  handled?: number
  severity?: string

  // Environment information
  platform: string
  platform_version?: string | null
  sdk: string
  sdk_version?: string | null
  release?: string | null
  environment: string
  serverName?: string | null
  runtime?: string | null
  runtime_version?: string | null

  // Request context
  transaction?: string | null
  transaction_duration?: number | null
  url?: string | null
  method?: string | null
  status_code?: number | null

  // Anonymous user context
  user_hash?: string | null
  session_id?: string | null
  client_info?: string | null

  // Error details
  exception?: string | null
  exception_type?: string | null
  exception_value?: string | null
  exception_module?: string | null
  stack_trace?: string | null
  frames_count?: number | null

  // Additional context
  request?: string | null
  tags?: string | null
  extra?: string | null
  breadcrumbs?: string | null
  contexts?: string | null
  fingerprint: string[]

  // Performance metrics
  memory_usage?: number | null
  cpu_usage?: number | null
  duration?: number | null

  // Metadata
  first_seen?: Date
  group_id?: string | null
  is_sample?: number
  sample_rate?: number
  has_been_processed?: number
}

// Note: The monitoring app uses ClickHouseService directly for all database operations
// instead of following the traditional model pattern. This is because ClickHouse
// doesn't work well with ORMs and direct SQL queries are more efficient.
