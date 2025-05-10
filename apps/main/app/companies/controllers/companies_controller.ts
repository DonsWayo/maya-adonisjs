import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import emitter from '@adonisjs/core/services/emitter'

import Company from '#companies/models/company'
import User from '#users/models/user'

import CompanyDto from '#companies/dtos/company'
import UserDto from '#users/dtos/user'

import CompanyPolicy from '#companies/policies/company_policy'

import { createCompanyValidator, editCompanyValidator } from '#companies/validators'

export default class CompaniesController {
  public async index({ bouncer, inertia }: HttpContext) {
    await bouncer.with(CompanyPolicy).authorize('viewList')

    const companies = await Company.query().preload('owner')
    // Use an empty string instead of null for the query comparison
    const users = await User.query().whereNot('role_id', '')

    await Company.preComputeUrls(companies)

    return inertia.render('companies/index', {
      companies: CompanyDto.fromArray(companies),
      users: UserDto.fromArray(users),
    })
  }

  public async show({ bouncer, params, inertia }: HttpContext) {
    const company = await Company.findOrFail(params.id)
    await company.load('owner')

    await bouncer.with(CompanyPolicy).authorize('view', company)

    await Company.preComputeUrls(company)

    return inertia.render('companies/show', {
      company: new CompanyDto(company),
    })
  }

  public async store({ bouncer, request, response }: HttpContext) {
    await bouncer.with(CompanyPolicy).authorize('create')

    // Validate the request data
    const data = await request.validateUsing(createCompanyValidator)
    
    // Create a new company object with basic data (excluding logo)
    // @ts-ignore - Ignoring type error for logo extraction
    const { logo, ...companyData } = data
    
    const company = new Company()
    // Generate a UUID for the company
    company.id = `com_${randomUUID()}`
    company.merge(companyData)
    
    // Save the company first
    await company.save()
    
    // Handle logo upload if provided
    const logoFile = request.file('logo')
    if (logoFile) {
      // Use the attachment decorator to handle the file
      await logoFile.move('uploads/companies', {
        name: `${company.id}_${Date.now()}.${logoFile.extname}`,
      })
      
      // Update the logo URL
      company.logoUrl = `/uploads/companies/${logoFile.fileName}`
      await company.save()
    }
    
    // Emit event for the new company
    // @ts-ignore - Ignoring type error for event emission
    await emitter.emit('company:created', { company })

    return response.redirect().toRoute('companies.index')
  }

  public async update({ bouncer, params, request, response }: HttpContext) {
    const company = await Company.findOrFail(params.id)

    await bouncer.with(CompanyPolicy).authorize('update', company)

    // Validate the request data
    const data = await request.validateUsing(editCompanyValidator, { meta: { companyId: params.id } })
    
    // Update company data (excluding logo)
    // @ts-ignore - Ignoring type error for logo extraction
    const { logo, ...companyData } = data
    company.merge(companyData)
    
    // Handle logo upload if provided
    const logoFile = request.file('logo')
    if (logoFile) {
      // Use the attachment decorator to handle the file
      await logoFile.move('uploads/companies', {
        name: `${company.id}_${Date.now()}.${logoFile.extname}`,
        overwrite: true,
      })
      
      // Update the logo URL
      company.logoUrl = `/uploads/companies/${logoFile.fileName}`
    }

    await company.save()
    
    // Emit event for the updated company
    // @ts-ignore - Ignoring type error for event emission
    await emitter.emit('company:updated', { company })

    return response.redirect().toRoute('companies.show', { id: company.id })
  }

  public async destroy({ bouncer, params, response }: HttpContext) {
    const company = await Company.findOrFail(params.id)

    await bouncer.with(CompanyPolicy).authorize('delete', company)

    const companyId = company.id
    await company.delete()
    
    // Emit event for the deleted company
    // @ts-ignore - Ignoring type error for event emission
    await emitter.emit('company:deleted', { companyId })

    return response.redirect().toRoute('companies.index')
  }
}
