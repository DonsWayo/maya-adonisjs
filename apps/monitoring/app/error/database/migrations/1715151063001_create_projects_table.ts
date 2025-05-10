import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'projects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name').notNullable()
      table.string('slug').notNullable().unique()
      table.string('platform').notNullable()
      table.string('dsn').notNullable().unique()
      table.string('public_key').notNullable().unique()
      table.string('secret_key').notNullable().unique()
      table.string('status').notNullable().defaultTo('active')
      table.uuid('organization_id').nullable()
      table.uuid('team_id').nullable()
      table.text('description').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
