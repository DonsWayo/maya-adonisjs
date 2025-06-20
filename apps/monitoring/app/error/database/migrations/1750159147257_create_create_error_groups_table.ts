import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'error_groups'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      table
        .uuid('project_id')
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')
      table.string('fingerprint_hash', 64).notNullable()
      table.specificType('fingerprint', 'text[]').notNullable()
      table.string('title', 200).notNullable()
      table.string('type', 100).notNullable()
      table.text('message').notNullable()
      table.string('platform', 50).notNullable()
      table
        .enum('status', ['unresolved', 'resolved', 'ignored', 'reviewing'])
        .defaultTo('unresolved')
        .notNullable()
      table.integer('event_count').defaultTo(0).notNullable()
      table.integer('user_count').defaultTo(0).notNullable()
      table.jsonb('metadata').defaultTo('{}').notNullable()
      table.text('ai_summary')
      table.specificType('ai_suggestions', 'text[]')
      table.uuid('assignee_id')
      table.timestamp('first_seen', { useTz: true }).notNullable()
      table.timestamp('last_seen', { useTz: true }).notNullable()
      table.timestamp('resolved_at', { useTz: true })
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // Indexes for performance
      table.index(['project_id', 'fingerprint_hash'], 'idx_error_groups_project_fingerprint')
      table.index(['project_id', 'status'], 'idx_error_groups_project_status')
      table.index(['project_id', 'last_seen'], 'idx_error_groups_project_last_seen')
      table.index(['assignee_id'], 'idx_error_groups_assignee')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
