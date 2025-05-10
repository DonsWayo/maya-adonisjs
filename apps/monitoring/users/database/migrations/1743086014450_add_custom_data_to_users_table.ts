import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    // We've already added custom_data in the create_users_table migration
    // This migration is kept for backwards compatibility
    this.defer(async (db) => {
      // Check if custom_data column already exists
      const hasColumn = await db.schema.hasColumn(this.tableName, 'custom_data')
      
      // Only add the column if it doesn't exist
      if (!hasColumn) {
        this.schema.alterTable(this.tableName, (table) => {
          table.jsonb('custom_data').nullable()
        })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('custom_data')
    })
  }
}
