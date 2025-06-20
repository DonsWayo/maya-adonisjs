import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'error_groups'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Add unique constraint on project_id and fingerprint_hash
      table.unique(['project_id', 'fingerprint_hash'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Drop the unique constraint
      table.dropUnique(['project_id', 'fingerprint_hash'])
    })
  }
}