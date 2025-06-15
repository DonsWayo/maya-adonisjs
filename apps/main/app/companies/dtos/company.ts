import { BaseModelDto } from '@adocasts.com/dto/base'

import Company from '#companies/models/company'

export default class CompanyDto extends BaseModelDto {
  declare id: string
  declare name: string
  declare description: string | null
  declare website: string | null
  declare email: string | null
  declare phone: string | null
  declare address: string | null
  declare city: string | null
  declare state: string | null
  declare postalCode: string | null
  declare country: string | null
  // Owner is now managed through user_companies relationship
  declare logoUrl: string | null
  declare createdAt: string
  declare updatedAt: string | null

  constructor(company?: Company) {
    super()

    if (!company) return

    this.id = company.id
    this.name = company.name
    this.description = company.description
    this.website = company.website
    this.email = company.email
    this.phone = company.phone
    this.address = company.address
    this.city = company.city
    this.state = company.state
    this.postalCode = company.postalCode
    this.country = company.country
    // Owner is now managed through user_companies relationship
    this.logoUrl = company.logo && company.logo.url ? company.logo.url : company.logoUrl
    this.createdAt = company.createdAt.toISO() || ''
    this.updatedAt = company.updatedAt ? company.updatedAt.toISO() || null : null
  }
}
