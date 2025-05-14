import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_companies'

  async up() {
    // Add foreign key constraints after all tables are created
    this.schema.alterTable(this.tableName, (table) => {
      table
        .foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      
      table
        .foreign('company_id')
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')
    })

    // Add foreign key for owner_id in companies table
    this.schema.alterTable('companies', (table) => {
      table
        .foreign('owner_id')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['user_id'])
      table.dropForeign(['company_id'])
    })

    this.schema.alterTable('companies', (table) => {
      table.dropForeign(['owner_id'])
    })
  }
}
