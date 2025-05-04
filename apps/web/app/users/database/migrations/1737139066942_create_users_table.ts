import { BaseSchema } from '@adonisjs/lucid/schema'

import Roles from '#users/enums/role'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Use UUID as primary key
      table.uuid('id').primary()
      
      // Keep existing role relationship
      table
        .integer('role_id')
        .unsigned()
        .references('id')
        .inTable('roles')
        .notNullable()
        .defaultTo(Roles.USER)
      
      // Basic Logto user fields
      table.string('full_name').nullable()
      table.string('email', 254).nullable().unique() // Make email nullable as per Logto
      table.string('username', 128).nullable().unique()
      table.string('primary_phone').nullable().unique()
      table.string('application_id').nullable()
      table.timestamp('last_sign_in_at').nullable()
      
      // Avatar fields
      table.string('avatar_url').nullable().defaultTo(null)
      table.json('avatar').nullable()
      
      // External identities
      table.json('identities').nullable() // Social identities
      table.json('sso_identities').nullable() // SSO identities
      
      // Profile data
      table.jsonb('profile').nullable() // For OpenID Connect standard claims
      
      // External ID for mapping to Logto
      table.string('external_id').nullable().unique()
      
      // Timestamps
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
