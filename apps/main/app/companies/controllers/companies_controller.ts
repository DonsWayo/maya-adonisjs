import type { HttpContext } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'

import Company from '#companies/models/company'
import User from '#users/models/user'

import CompanyDto from '#companies/dtos/company'
import UserDto from '#users/dtos/user'

import CompanyPolicy from '#companies/policies/company_policy'

import { createCompanyValidator, editCompanyValidator } from '#companies/validators'
import { managementApiService } from '#auth/logto/index'
import { LogtoError } from '#users/types/errors'

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

  public async create({ inertia, auth, session }: HttpContext) {
    const user = auth.user as User
    const intendedUrl = session.get('intended_url')
    
    return inertia.render('companies/create', {
      users: [user],
      intendedUrl
    })
  }

  public async show({ bouncer, params, inertia }: HttpContext) {
    const company = await Company.findOrFail(params.id)
    await company.load('owner')

    // Cast to any to work around type issue with async policy methods
    await bouncer.with(CompanyPolicy).authorize('view' as any, company)

    await Company.preComputeUrls(company)

    return inertia.render('companies/show', {
      company: new CompanyDto(company),
    })
  }

  public async store({ bouncer, request, response, auth }: HttpContext) {
    await bouncer.with(CompanyPolicy).authorize('create')
    try {
      // Validate the request data
      const data = await request.validateUsing(createCompanyValidator)
      
      // Create a new company object with basic data (excluding logo)
      const { logo, ...companyData } = data
      
      // Check if a company with the same name already exists
      const existingCompany = await Company.query().where('name', companyData.name).first()
      
      if (existingCompany) {
        return response.status(422).json({
          errors: {
            name: [`A company with the name '${companyData.name}' already exists.`]
          }
        })
      }
      
      // Create organization in Logto
      const logtoOrganization = await managementApiService.createOrganization(
        companyData.name,
        companyData.description || undefined
      )
      
      const company = new Company()
      // Generate a UUID for the company
      company.merge(companyData)
      // Store the Logto organization ID
      company.externalId = logtoOrganization.id
      
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
      
      // Add current user to the Logto organization if they have an externalId
      const user = auth.user as User
      if (user && user.externalId) {
        try {
          // First ensure that tenant-level organization roles exist
          console.log('Ensuring organization roles exist at tenant level')
          
          // Define the roles we need for organizations
          const requiredRoles = [
            { name: 'admin', description: 'Organization administrator with full access' },
            { name: 'member', description: 'Regular organization member' }
          ]
          
          // Create roles if they don't exist at the tenant level
          const rolesResult = await managementApiService.ensureOrganizationRoles(requiredRoles)
          console.log('Organization roles setup result:', rolesResult)
          
          // Get the admin role ID from the result
          let adminRoleId = null
          if (rolesResult.existingRoles && rolesResult.existingRoles.length > 0) {
            const adminRole = rolesResult.existingRoles.find((role: any) => role.name === 'admin')
            if (adminRole) {
              adminRoleId = adminRole.id
            }
          }
          
          if (!adminRoleId && rolesResult.createdRoles && rolesResult.createdRoles.length > 0) {
            const adminRole = rolesResult.createdRoles.find((role: any) => role.name === 'admin')
            if (adminRole) {
              adminRoleId = adminRole.id
            }
          }
          
          // Now add the user to the organization
          console.log(`Adding user ${user.externalId} to Logto organization ${logtoOrganization.id}`)
          const saveInLogto = await managementApiService.addUserToOrganization(
            user.externalId,
            logtoOrganization.id
          )
          console.log('Successfully added user to organization:', saveInLogto)
          
          // If we found the admin role ID, assign it to the user
          if (adminRoleId) {
            try {
              console.log(`Assigning admin role ${adminRoleId} to user ${user.externalId} in organization ${logtoOrganization.id}`)
              const roleAssignment = await managementApiService.assignUserOrganizationRoles(
                logtoOrganization.id,
                user.externalId,
                [adminRoleId]
              )
              console.log('Successfully assigned admin role to user:', roleAssignment)
            } catch (roleError) {
              console.error('Failed to assign admin role to user:', roleError)
              // Continue even if role assignment fails
            }
          } else {
            console.warn('Could not find or create admin role for organization')
          }
          
          // Create the user-company relationship using the ORM
          await company.related('users').attach({
            [user.id]: {
              role: 'admin',
              is_primary: true,
              custom_data: JSON.stringify({})
            }
          })
        } catch (logtoError) {
          console.error('Failed to add user to Logto organization:', logtoError)
          
          // Even if adding the user to the Logto organization fails,
          // we still want to create the user-company relationship in our database
          await company.related('users').attach({
            [user.id]: {
              role: 'admin',
              is_primary: true,
              custom_data: JSON.stringify({})
            }
          })
          console.log(`Created user-company relationship for user ${user.id} and company ${company.id} despite Logto error`)
          
          // We don't throw here because we want the company creation to succeed
          // even if the Logto organization membership fails
        }
      } else {
        console.warn('User has no externalId, cannot add to Logto organization')
      }
      
      // Emit event for the new company
      await emitter.emit('company:created', { company })

      return response.redirect().toRoute('companies.index')
    } catch (error) {
      console.error('Error creating company:', error)
      
      if (error instanceof LogtoError) {
        // Handle Logto API errors
        return response.status(500).send({
          error: 'Failed to create organization in Logto',
          details: error.message,
        })
      }
      
      // Re-throw other errors to be handled by the global error handler
      throw error
    }
  }

  public async update({ bouncer, params, request, response }: HttpContext) {
    const company = await Company.findOrFail(params.id)

    await bouncer.with(CompanyPolicy).authorize('update', company)

    try {
      // Validate the request data
      const data = await request.validateUsing(editCompanyValidator, { meta: { companyId: params.id } })
      
      // Update company data (excluding logo)
      // @ts-ignore - Ignoring type error for logo extraction
      const { logo, ...companyData } = data
      
      // Check if another company with the same name already exists (excluding current company)
      const existingCompany = await Company.query()
        .where('name', companyData.name)
        .whereNot('id', company.id)
        .first()
      
      if (existingCompany) {
        return response.status(422).json({
          errors: {
            name: [`A company with the name '${companyData.name}' already exists.`]
          }
        })
      }
      
      company.merge(companyData)
      
      // Update the organization in Logto if we have an externalId
      if (company.externalId) {
        await managementApiService.updateOrganization(company.externalId, {
          name: companyData.name,
          description: companyData.description || undefined,
        })
      }
      
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
    } catch (error) {
      console.error('Error updating company:', error)
      
      if (error instanceof LogtoError) {
        // Handle Logto API errors
        return response.status(500).send({
          error: 'Failed to update organization in Logto',
          details: error.message,
        })
      }
      
      // Re-throw other errors to be handled by the global error handler
      throw error
    }
  }

  public async destroy({ bouncer, params, response }: HttpContext) {
    const company = await Company.findOrFail(params.id)

    await bouncer.with(CompanyPolicy).authorize('delete', company)

    try {
      // Delete the organization from Logto if we have an externalId
      if (company.externalId) {
        await managementApiService.deleteOrganization(company.externalId)
      }

      const companyId = company.id
      await company.delete()
      
      // Emit event for the deleted company
      // @ts-ignore - Ignoring type error for event emission
      await emitter.emit('company:deleted', { companyId })

      return response.redirect().toRoute('companies.index')
    } catch (error) {
      console.error('Error deleting company:', error)
      
      if (error instanceof LogtoError) {
        // Handle Logto API errors
        return response.status(500).send({
          error: 'Failed to delete organization from Logto',
          details: error.message,
        })
      }
      
      // Re-throw other errors to be handled by the global error handler
      throw error
    }
  }
}
