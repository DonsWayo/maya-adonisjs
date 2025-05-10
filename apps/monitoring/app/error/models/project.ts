import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'

export default class Project extends BaseModel {
  /**
   * Table name in PostgreSQL
   */
  static table = 'projects'

  /**
   * Primary key
   */
  @column({ isPrimary: true })
  declare id: string

  /**
   * Project name
   */
  @column()
  declare name: string

  /**
   * Project slug (URL-friendly identifier)
   */
  @column()
  declare slug: string

  /**
   * Project platform (javascript, python, etc.)
   */
  @column()
  declare platform: string

  /**
   * Project DSN (Data Source Name) - used for authentication
   */
  @column()
  declare dsn: string

  /**
   * Project public key
   */
  @column()
  declare publicKey: string

  /**
   * Project secret key
   */
  @column()
  declare secretKey: string

  /**
   * Project status (active, inactive, etc.)
   */
  @column()
  declare status: string

  /**
   * Project organization ID
   */
  @column()
  declare organizationId: string | null

  /**
   * Project team ID
   */
  @column()
  declare teamId: string | null

  /**
   * Project description
   */
  @column()
  declare description: string | null

  /**
   * Created at timestamp
   */
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  /**
   * Updated at timestamp
   */
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Generate DSN, public key, and secret key before creating
   */
  static beforeCreate(project: Project) {
    project.id = project.id || randomUUID()
    project.publicKey = project.publicKey || randomUUID().replace(/-/g, '')
    project.secretKey = project.secretKey || randomUUID().replace(/-/g, '')
    project.dsn = project.dsn || `https://${project.publicKey}@sentry.example.com/${project.id}`
  }
}
