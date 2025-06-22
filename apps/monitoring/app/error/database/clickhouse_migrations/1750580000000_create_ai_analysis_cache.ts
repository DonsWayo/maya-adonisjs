import clickhouse from 'adonis-clickhouse/services/main'

export default class CreateAiAnalysisCache {
  public async up() {
    // Create AI Analysis Cache Table
    await clickhouse.query({
      query: `
        CREATE TABLE IF NOT EXISTS ai_analysis_cache
        (
            -- Primary identification
            fingerprint_hash String,
            analysis_type Enum8('error_analysis' = 1, 'suggested_fix' = 2, 'similar_errors' = 3),
            
            -- AI provider details
            provider String,
            model String,
            
            -- Analysis content
            analysis_result String, -- JSON containing the analysis
            prompt_hash String, -- Hash of the prompt used (for versioning)
            
            -- Quality and sharing
            confidence_score Float32 DEFAULT 0.8,
            is_public UInt8 DEFAULT 0, -- 1 = can be shared across projects/companies
            error_patterns Array(String), -- Common patterns found in this error type
            
            -- Usage tracking
            created_at DateTime DEFAULT now(),
            last_used_at DateTime DEFAULT now(),
            usage_count UInt32 DEFAULT 1,
            projects_used Array(String), -- Track which projects have used this
            
            -- Feedback and improvement
            avg_feedback_score Nullable(Float32),
            feedback_count UInt32 DEFAULT 0,
            
            -- Cost tracking
            tokens_saved UInt32 DEFAULT 0, -- Cumulative tokens saved by caching
            cost_saved_cents UInt32 DEFAULT 0, -- Cumulative cost saved
            
            -- Metadata
            metadata String DEFAULT '{}' -- JSON for additional data
        ) ENGINE = MergeTree()
        ORDER BY (fingerprint_hash, analysis_type, created_at)
        PARTITION BY toYYYYMM(created_at)
        TTL created_at + INTERVAL 6 MONTH
        SETTINGS index_granularity = 8192
      `,
    })

    // Add indexes
    await clickhouse.query({
      query: `ALTER TABLE ai_analysis_cache ADD INDEX IF NOT EXISTS idx_prompt_hash prompt_hash TYPE bloom_filter(0.01) GRANULARITY 1`,
    })

    await clickhouse.query({
      query: `ALTER TABLE ai_analysis_cache ADD INDEX IF NOT EXISTS idx_public is_public TYPE minmax GRANULARITY 1`,
    })

    // Create materialized view for cache statistics
    await clickhouse.query({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS ai_cache_stats
        ENGINE = SummingMergeTree()
        ORDER BY (analysis_type, provider, model, date)
        AS SELECT
            analysis_type,
            provider,
            model,
            toDate(last_used_at) as date,
            count() as cache_hits,
            sum(tokens_saved) as total_tokens_saved,
            sum(cost_saved_cents) as total_cost_saved_cents,
            avg(confidence_score) as avg_confidence,
            avg(avg_feedback_score) as avg_feedback
        FROM ai_analysis_cache
        GROUP BY analysis_type, provider, model, date
      `,
    })
  }

  public async down() {
    await clickhouse.query({ query: 'DROP VIEW IF EXISTS ai_cache_stats' })
    await clickhouse.query({ query: 'DROP TABLE IF EXISTS ai_analysis_cache' })
  }
}