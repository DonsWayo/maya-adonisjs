import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'companies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Use UUID as primary key with auto-generation
      table.uuid('id').primary().defaultTo(this.db.rawQuery('uuid_generate_v4()').knexQuery)
      
      // Basic company fields
      table.string('name').notNullable().unique()
      table.text('description').nullable()
      table.string('website').nullable()
      table.string('email', 254).nullable().unique()
      table.string('phone').nullable()
      
      // Address fields
      table.string('address').nullable()
      table.string('city').nullable()
      table.string('state').nullable()
      table.string('postal_code').nullable()
      table.string('country').nullable()
      
      // Owner relationship with UUID
      table
        .uuid('owner_id')
        .references('id')
        .inTable('users')
        .nullable()
        .onDelete('SET NULL')
      
      // Logo fields
      table.string('logo_url').nullable().defaultTo(null)
      table.json('logo').nullable()
      
      // Custom data
      table.jsonb('custom_data').nullable()
      
      // Timestamps
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
