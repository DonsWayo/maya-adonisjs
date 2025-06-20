import clickhouse from 'adonis-clickhouse/services/main'

export default class CreateErrorEventsTable {
  public async up() {
    // Create the error_events table with ClickHouse-specific SQL
    await clickhouse.query({
      query: `CREATE TABLE IF NOT EXISTS error_events (
          /* Core event identifiers */
          id String,                              -- Unique identifier for the error event
          timestamp DateTime,                    -- Timestamp of the error event
          received_at DateTime,                  -- When the event was received by the server
          project_id String,                     -- Project identifier
          
          /* Error classification */
          level String,                          -- Error level (error, warning, info, debug, etc.)
          message String,                        -- Error message
          type String,                          -- Error type/class
          handled UInt8,                        -- Whether the error was handled (1) or unhandled (0)
          severity Enum8('fatal'=1, 'error'=2, 'warning'=3, 'info'=4, 'debug'=5), -- Error severity
          
          /* Environment information */
          platform String,                       -- Platform (web, mobile, desktop, server, etc.)
          platform_version Nullable(String),     -- Platform version
          sdk String,                           -- SDK used to capture the error
          sdk_version Nullable(String),         -- SDK version
          release Nullable(String),             -- Application release version
          environment String,                   -- Environment (production, staging, development, etc.)
          server_name Nullable(String),         -- Server hostname
          runtime Nullable(String),             -- Runtime environment (Node.js, browser, etc.)
          runtime_version Nullable(String),     -- Runtime version
          
          /* Request context */
          transaction Nullable(String),         -- Transaction name/route
          transaction_duration Nullable(Float64), -- Transaction duration in milliseconds
          url Nullable(String),                 -- URL where the error occurred
          method Nullable(String),              -- HTTP method if applicable
          status_code Nullable(UInt16),         -- HTTP status code if applicable
          
          /* Anonymous user context */
          user_hash Nullable(String),           -- Anonymized user identifier (hashed)
          session_id Nullable(String),          -- Anonymous session identifier
          client_info Nullable(String),         -- Anonymized client information (browser/device type)
          
          /* Error details */
          exception Nullable(String),           -- Exception details (JSON)
          exception_type Nullable(String),      -- Exception type/class name
          exception_value Nullable(String),     -- Exception value/message
          exception_module Nullable(String),    -- Module where exception occurred
          stack_trace Nullable(String),         -- Stack trace (JSON)
          frames_count Nullable(UInt16),        -- Number of frames in stack trace
          
          /* Additional context */
          request Nullable(String),             -- Request data (JSON)
          tags Nullable(String),                -- Tags (JSON)
          extra Nullable(String),               -- Extra data (JSON)
          breadcrumbs Nullable(String),         -- Breadcrumbs (JSON)
          contexts Nullable(String),            -- Contexts (JSON)
          fingerprint Array(String),            -- Error fingerprint for grouping
          
          /* Performance metrics */
          memory_usage Nullable(UInt64),        -- Memory usage in bytes
          cpu_usage Nullable(Float32),          -- CPU usage percentage
          duration Nullable(UInt32),            -- Error handling duration in ms
          
          /* Metadata */
          first_seen DateTime DEFAULT now(), -- When this error was first seen
          group_id Nullable(String),            -- Error group identifier
          is_sample UInt8 DEFAULT 0,            -- Whether this is a sample event (for rate limiting)
          sample_rate Float32 DEFAULT 1.0,       -- Sample rate applied
          has_been_processed UInt8 DEFAULT 0    -- Whether this event has been processed
        ) ENGINE = MergeTree() ORDER BY (timestamp, project_id, id) PARTITION BY toYYYYMM(timestamp) TTL timestamp + INTERVAL 1 YEAR`,
    })
  }

  public async down() {
    // Drop the error_events table
    await clickhouse.query({
      query: 'DROP TABLE IF EXISTS error_events;',
    })
  }
}
