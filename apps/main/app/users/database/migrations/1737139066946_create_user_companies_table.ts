import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_companies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Use UUID as primary key with auto-generation
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      
      // User and company references - without foreign key constraints initially
      // These will be added in a separate migration after all tables are created
      table.uuid('user_id').notNullable()
      table.uuid('company_id').notNullable()
      
      // Role within the company (admin, member, etc.)
      table.string('role').notNullable().defaultTo('member')
      
      // Is this the user's primary company?
      table.boolean('is_primary').notNullable().defaultTo(false)
      
      // Custom data for the user-company relationship
      table.jsonb('custom_data').nullable()

      // Timestamps
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      
      // Unique constraint to prevent duplicate user-company relationships
      table.unique(['user_id', 'company_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
