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


    // Load companies with their associated users
    const companies = await Company.query().preload('users')
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

  public async show({ bouncer, params, inertia, auth }: HttpContext) {
    const company = await Company.findOrFail(params.id)
    // Load users associated with this company
    await company.load('users')
    
    // Preload the current user's companies relationship for the policy check
    const user = auth.user as User
    await user.load('companies')

    await bouncer.with(CompanyPolicy).authorize('view', company)

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
      
      // Add current user to the Logto organization
      const user = auth.user as User
      
      // If user doesn't have an externalId, try to set it from Logto
      if (user && !user.externalId) {
        try {
          // Get user info from Logto to set externalId
          console.log('User has no externalId, attempting to get it from Logto')
          // Make sure email is not null before calling getUserInfo
          if (user.email) {
            const userInfo = await managementApiService.getUserInfo(user.email)
            
            if (userInfo && userInfo.id) {
              console.log(`Found Logto user ID ${userInfo.id} for email ${user.email}`)
              user.externalId = userInfo.id
              await user.save()
              console.log(`Updated user ${user.id} with externalId ${user.externalId}`)
            }
          }
        } catch (error) {
          console.error('Failed to get user info from Logto:', error)
          // Continue even if we can't get the externalId
        }
      }
      
      // Try to add the user to the Logto organization
      if (user && user.externalId) {
        try {
          // First ensure that tenant-level organization roles exist
          await managementApiService.ensureOrganizationRoles([
            { name: 'admin', description: 'Administrator of the organization' },
            { name: 'member', description: 'Member of the organization' }
          ])
          
          // Add the user to the Logto organization with the admin role
          // Ensure both user.externalId and company.externalId are not null
          if (user.externalId && company.externalId) {
            await managementApiService.addUserToOrganization(
              user.externalId,
              company.externalId,
              ['admin']
            )
          } else {
            console.log('Cannot add user to Logto organization: missing external IDs')
          }
          
          // Assign the admin role to the user in the organization
          // Ensure both user.externalId and company.externalId are not null
          if (user.externalId && company.externalId) {
            await managementApiService.assignUserOrganizationRoles(
              user.externalId,
              company.externalId,
              ['admin']
            )
          }
          
          console.log(`Added user ${user.id} to Logto organization ${company.externalId} with admin role`)
        } catch (error) {
          console.error('Failed to add user to Logto organization:', error)
          // Continue even if we can't add the user to the Logto organization
        }
      } else {
        console.log('User has no externalId, cannot add to Logto organization')
        
        // Still create the user-company relationship in the database
        try {
          // Add the user to the company with admin role in the database
          await company.related('users').attach({
            [user.id]: {
              role: 'admin',
              is_primary: true
            }
          })
          console.log(`Added user ${user.id} to company ${company.id} with admin role in database only`)
        } catch (dbError) {
          console.error('Failed to add user to company in database:', dbError)
        }
      }
      
      console.log('User information:', {
        id: user.id,
        email: user.email,
        externalId: user.externalId,
      })
      
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
          
          // Assign the admin role to the user by name, not by ID
          try {
            console.log(`Assigning admin role to user ${user.externalId} in organization ${logtoOrganization.id}`)
            const roleAssignment = await managementApiService.assignUserOrganizationRoles(
              user.externalId,
              logtoOrganization.id,
              ['admin'] // Use the role name instead of the ID
            )
            console.log('Successfully assigned admin role to user:', roleAssignment)
          } catch (roleError) {
            console.error('Failed to assign admin role to user:', roleError)
            // Continue even if role assignment fails
          }
          
          // Create the user-company relationship using the ORM
          // Add timestamps to fix the not-null constraint on created_at
          const now = new Date()
          await company.related('users').attach({
            [user.id]: {
              role: 'admin',
              is_primary: true,
              custom_data: JSON.stringify({}),
              created_at: now,
              updated_at: now
            }
          })
        } catch (logtoError) {
          console.error('Failed to add user to Logto organization:', logtoError)
          
          // Even if adding the user to the Logto organization fails,
          // we still want to create the user-company relationship in our database
          // Add timestamps to fix the not-null constraint on created_at
          const now = new Date()
          await company.related('users').attach({
            [user.id]: {
              role: 'admin',
              is_primary: true,
              custom_data: JSON.stringify({}),
              created_at: now,
              updated_at: now
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
          message: error.message
        })
      }
      
      throw error
    }
  }

  public async edit({ bouncer, params, inertia, auth }: HttpContext) {
    const company = await Company.findOrFail(params.id)
    await company.load('users')
    
    // Preload the current user's companies relationship for the policy check
    const user = auth.user as User
    await user.load('companies')
    
    await bouncer.with(CompanyPolicy).authorize('update', company)
    
    // Get all users for the owner dropdown
    const users = await User.query().whereNot('role_id', '')
    
    await Company.preComputeUrls(company)
    
    return inertia.render('companies/edit', {
      company: new CompanyDto(company),
      users: UserDto.fromArray(users)
    })
  }

  public async update({ bouncer, params, request, response, auth }: HttpContext) {
    const company = await Company.findOrFail(params.id)
    
    // Preload the current user's companies relationship for the policy check
    const user = auth.user as User
    await user.load('companies')
    
    await bouncer.with(CompanyPolicy).authorize('update', company)
    
    try {
      // Validate the request data
      // Pass the company ID as a parameter to the validator function
      const data = await request.validateUsing(editCompanyValidator, params.id)
      
      // Extract logo from data
      const { logo, ...companyData } = data
      
      // Check if a company with the same name already exists (excluding this company)
      const existingCompany = await Company.query()
        .where('name', companyData.name)
        .whereNot('id', params.id)
        .first()
      
      if (existingCompany) {
        return response.status(422).json({
          errors: {
            name: [`A company with the name '${companyData.name}' already exists.`]
          }
        })
      }
      
      // Update the company with the new data
      company.merge(companyData)
      
      // Handle logo upload if provided
      const logoFile = request.file('logo')
      if (logoFile) {
        await logoFile.move('uploads/companies', {
          name: `${company.id}_${Date.now()}.${logoFile.extname}`,
        })
        
        company.logoUrl = `/uploads/companies/${logoFile.fileName}`
      }
      
      await company.save()
      
      // Emit event for the updated company
      await emitter.emit('company:updated', { company })
      
      return response.redirect().toRoute('companies.show', { id: company.id })
    } catch (error) {
      console.error('Error updating company:', error)
      throw error
    }
  }

  public async destroy({ bouncer, params, response, auth }: HttpContext) {
    const company = await Company.findOrFail(params.id)
    
    // Preload the current user's companies relationship for the policy check
    const user = auth.user as User
    await user.load('companies')
    
    await bouncer.with(CompanyPolicy).authorize('delete', company)
    
    try {
      // Delete the company from Logto if it has an external ID
      if (company.externalId) {
        try {
          await managementApiService.deleteOrganization(company.externalId)
        } catch (logtoError) {
          console.error('Failed to delete organization from Logto:', logtoError)
          // Continue with deletion even if Logto deletion fails
        }
      }
      
      // Delete the company from the database
      await company.delete()
      
      // Emit event for the deleted company with the correct data structure
      // The event expects companyId, not the company object
      await emitter.emit('company:deleted', { companyId: company.id })
      
      return response.redirect().toRoute('companies.index')
    } catch (error) {
      console.error('Error deleting company:', error)
      throw error
    }
  }
  
  /**
   * API methods for M2M communication
   */
  
  /**
   * Get all companies (API endpoint)
   * Used by other services to fetch all companies
   */
  public async indexApi({ response }: HttpContext) {
    try {
      const companies = await Company.all()
      
      return response.json({
        companies: companies.map(company => ({
          id: company.id,
          name: company.name,
          description: company.description,
          logoUrl: company.logoUrl,
          externalId: company.externalId,
        }))
      })
    } catch (error) {
      console.error('Error fetching companies:', error)
      return response.status(500).json({ error: 'Failed to fetch companies' })
    }
  }
  
  /**
   * Get a company by ID (API endpoint)
   * Used by other services to fetch company details
   */
  public async showApi({ params, response }: HttpContext) {
    try {
      const company = await Company.findOrFail(params.id)
      // No need to manually load users as the DTO will handle this
      
      return response.json(new CompanyDto(company))
    } catch (error) {
      return response.status(404).json({ error: 'Company not found' })
    }
  }
}
