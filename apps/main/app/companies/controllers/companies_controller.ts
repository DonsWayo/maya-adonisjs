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
    const users = await User.query().where('role_id', '!=', null)

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

    const payload = await request.validateUsing(createCompanyValidator)

    const company = new Company()
    // Generate a UUID for the company
    company.id = `com_${randomUUID()}`
    company.merge(payload)

    // Handle logo upload if provided
    if (request.file('logo')) {
      await company.related('logo').create(request.file('logo')!)
    }

    await company.save()
    
    // Emit event for the new company
    await emitter.emit('company:created', { company, source: 'admin_panel' })

    return response.redirect().toRoute('companies.index')
  }

  public async update({ bouncer, params, request, response }: HttpContext) {
    const company = await Company.findOrFail(params.id)

    await bouncer.with(CompanyPolicy).authorize('update', company)

    const payload = await request.validateUsing(editCompanyValidator, { meta: { companyId: params.id } })
    company.merge(payload)

    // Handle logo upload if provided
    if (request.file('logo')) {
      // Delete existing logo if any
      if (company.logo) {
        await company.related('logo').delete()
      }
      await company.related('logo').create(request.file('logo')!)
    }

    await company.save()
    
    // Emit event for the updated company
    await emitter.emit('company:updated', { company, source: 'admin_panel' })

    return response.redirect().toRoute('companies.show', { id: company.id })
  }

  public async destroy({ bouncer, params, response }: HttpContext) {
    const company = await Company.findOrFail(params.id)

    await bouncer.with(CompanyPolicy).authorize('delete', company)

    const companyId = company.id
    await company.delete()
    
    // Emit event for the deleted company
    await emitter.emit('company:deleted', { companyId })

    return response.redirect().toRoute('companies.index')
  }
}
