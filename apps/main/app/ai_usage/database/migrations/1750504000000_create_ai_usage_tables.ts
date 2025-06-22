import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_usage'

  async up() {
    // Create AI usage tracking table
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      
      // Relations
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE')
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.uuid('project_id').nullable() // Reference to monitoring app projects
      table.string('app_name').notNullable() // Which app made the request (monitoring, main, etc)
      
      // Provider details
      table.string('provider').notNullable() // openai, anthropic, google, etc
      table.string('model').notNullable() // gpt-4, claude-3-opus, etc
      table.string('operation').notNullable() // generate, embed, extract, stream
      
      // Token usage
      table.integer('prompt_tokens').notNullable().defaultTo(0)
      table.integer('completion_tokens').notNullable().defaultTo(0)
      table.integer('total_tokens').notNullable().defaultTo(0)
      
      // Cost tracking (in cents to avoid float precision issues)
      table.integer('prompt_cost_cents').notNullable().defaultTo(0)
      table.integer('completion_cost_cents').notNullable().defaultTo(0)
      table.integer('total_cost_cents').notNullable().defaultTo(0)
      table.string('currency', 3).notNullable().defaultTo('USD')
      
      // Performance metrics
      table.integer('latency_ms').nullable()
      table.boolean('cached').notNullable().defaultTo(false)
      table.boolean('success').notNullable().defaultTo(true)
      table.text('error_message').nullable()
      
      // Request context
      table.string('feature').nullable() // error_analysis, chat, completion, etc
      table.text('prompt').nullable() // Store prompt for debugging (be careful with PII)
      table.text('completion').nullable() // Store response for debugging
      table.jsonb('metadata').nullable() // Additional context
      
      // Timestamps
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      
      // Indexes for performance
      table.index(['company_id', 'created_at'])
      table.index(['user_id', 'created_at'])
      table.index(['provider', 'model'])
      table.index(['app_name', 'feature'])
      table.index('created_at')
    })

    // Create AI usage limits table
    this.schema.createTable('ai_usage_limits', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      
      table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE')
      table.string('period').notNullable() // daily, weekly, monthly
      
      // Limits
      table.integer('max_requests').nullable()
      table.integer('max_tokens').nullable()
      table.integer('max_cost_cents').nullable()
      
      // Current usage (reset periodically)
      table.integer('current_requests').notNullable().defaultTo(0)
      table.integer('current_tokens').notNullable().defaultTo(0)
      table.integer('current_cost_cents').notNullable().defaultTo(0)
      table.timestamp('period_start', { useTz: true }).notNullable()
      table.timestamp('period_end', { useTz: true }).notNullable()
      
      // Notifications
      table.integer('warning_threshold_percent').defaultTo(80)
      table.boolean('warning_sent').defaultTo(false)
      
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      
      // Unique constraint
      table.unique(['company_id', 'period'])
    })

    // Create AI cost configuration table
    this.schema.createTable('ai_cost_config', (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      
      table.string('provider').notNullable()
      table.string('model').notNullable()
      table.string('operation').notNullable() // generate, embed
      
      // Cost per 1K tokens in cents
      table.decimal('prompt_cost_per_1k_cents', 10, 4).notNullable()
      table.decimal('completion_cost_per_1k_cents', 10, 4).notNullable()
      
      // Valid period
      table.timestamp('effective_from', { useTz: true }).notNullable()
      table.timestamp('effective_to', { useTz: true }).nullable()
      
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      
      // Ensure only one active config per provider/model/operation
      table.index(['provider', 'model', 'operation', 'effective_from'])
    })
  }

  async down() {
    this.schema.dropTable('ai_cost_config')
    this.schema.dropTable('ai_usage_limits')
    this.schema.dropTable(this.tableName)
  }
}