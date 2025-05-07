import type Company from '#companies/models/company'

declare module '@adonisjs/core/types' {
  interface EventsList {
    'company:created': { company: Company }
    'company:updated': { company: Company }
    'company:deleted': { companyId: string }
  }
}
