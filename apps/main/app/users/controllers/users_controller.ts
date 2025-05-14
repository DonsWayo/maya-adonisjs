import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import emitter from '@adonisjs/core/services/emitter'

import User from '#users/models/user'
import Role from '#users/models/role'

import UserDto from '#users/dtos/user'
import RoleDto from '#users/dtos/role'

import UserPolicy from '#users/policies/user_policy'

import { createUserValidator, editUserValidator } from '#users/validators'

export default class UsersController {
  /**
   * Web UI methods
   */
  public async index({ bouncer, inertia }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('viewList')

    const users = await User.query().preload('role')
    const roles = await Role.all()

    await User.preComputeUrls(users)

    return inertia.render('users/index', {
      users: UserDto.fromArray(users),
      roles: RoleDto.fromArray(roles),
    })
  }

  public async store({ bouncer, request, response }: HttpContext) {
    await bouncer.with(UserPolicy).authorize('create')

    const payload = await request.validateUsing(createUserValidator)

    const user = new User()
    // Generate a UUID for the user
    user.id = `usr_${randomUUID()}`
    user.merge(payload)

    await user.save()
    
    // Emit event for the new user
    await emitter.emit('user:created', { user, source: 'admin_panel' })

    return response.redirect().toRoute('users.index')
  }

  public async update({ bouncer, params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    await bouncer.with(UserPolicy).authorize('update', user)

    const payload = await request.validateUsing(editUserValidator, { meta: { userId: params.id } })
    user.merge(payload)

    await user.save()
    
    // Emit event for the updated user
    await emitter.emit('user:updated', { user, source: 'admin_panel' })

    return response.redirect().toRoute('users.index')
  }

  public async destroy({ bouncer, params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    await bouncer.with(UserPolicy).authorize('delete', user)

    const userId = user.id
    await user.delete()
    
    // Emit event for the deleted user
    await emitter.emit('user:deleted', { userId })

    return response.redirect().toRoute('users.index')
  }

  /**
   * API methods for M2M communication
   */
  
  /**
   * List all users
   * Used by other services to fetch all users
   */
  public async indexApi({ response, logger }: HttpContext) {
    logger.info('API: Fetching all users')
    
    try {
      const users = await User.query().preload('role')
      logger.info(`Found ${users.length} users`)
      
      // Create a plain object for the response to ensure it serializes properly
      const usersData = users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleId: user.roleId,
        role: user.role ? user.role.name : null,
        externalId: user.externalId,
        username: user.username,
        createdAt: user.createdAt.toISO(),
        updatedAt: user.updatedAt ? user.updatedAt.toISO() : null,
      }))
      
      // Set proper content type and ensure the response is not empty
      response.header('Content-Type', 'application/json')
      return response.json(usersData)
    } catch (error) {
      logger.error(`Error fetching users: ${error.message}`)
      return response.status(500).json({ 
        error: 'Failed to fetch users', 
        message: error.message 
      })
    }
  }
  
  /**
   * Get a user by ID
   * Used by other services to fetch user details
   * Supports both UUID and external ID formats
   */
  public async show({ params, response, logger }: HttpContext) {
    const { id } = params
    
    logger.info(`API: Fetching user with ID ${id}`)
    
    try {
      // Check if the ID is a valid UUID using regex pattern
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const isUuid = uuidRegex.test(id)
      let user = null
      
      if (isUuid) {
        // If it's a UUID, query by ID
        user = await User.find(id)
        if (user) {
          logger.info(`User found by UUID: ${id}`)
        } else {
          logger.info(`No user found with UUID: ${id}`)
        }
      } else {
        // If not a UUID, try to find by external ID
        user = await User.query().where('external_id', id).first()
        if (user) {
          logger.info(`User found by external ID: ${id}`)
        } else {
          logger.info(`No user found with external ID: ${id}`)
        }
      }
      
      if (!user) {
        if (isUuid) {
          return response.notFound({
            error: 'User not found',
            message: `User with UUID ${id} not found`
          })
        } else {
          return response.notFound({
            error: 'User not found',
            message: `User with external ID ${id} not found. Use the /api/v1/users/external/${id} endpoint for external IDs.`
          })
        }
      }
      
      // Load role information if not already loaded
      if (!user.$preloaded.role) {
        await user.load('role')
      }
      
      // Create a plain object for the response to ensure it serializes properly
      const userData = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleId: user.roleId,
        role: user.role ? user.role.name : null,
        externalId: user.externalId,
        username: user.username,
        primaryPhone: user.primaryPhone,
        avatarUrl: user.avatarUrl,
        lastSignInAt: user.lastSignInAt ? user.lastSignInAt.toISO() : null,
        createdAt: user.createdAt.toISO(),
        updatedAt: user.updatedAt ? user.updatedAt.toISO() : null,
      }
      
      // Set proper content type and ensure the response is not empty
      response.header('Content-Type', 'application/json')
      logger.info('Sending user data response')
      return response.json(userData)
    } catch (error) {
      logger.error(`Error fetching user ${params.id}: ${error.message}`)
      return response.status(500).json({ 
        error: 'Error fetching user', 
        message: error.message 
      })
    }
  }
  
  /**
   * Get a user by external ID
   * Used by other services to fetch user details using Logto's external ID
   */
  public async showByExternalId({ params, response, logger }: HttpContext) {
    logger.info(`API: Fetching user with external ID ${params.externalId}`)
    
    try {
      const user = await User.query().where('external_id', params.externalId).firstOrFail()
      logger.info(`User found by external ID: ${user.id}`)
      
      // Load role relationship if not already loaded
      if (!user.$preloaded.role) {
        await user.load('role')
      }
      
      // Create a plain object for the response to ensure it serializes properly
      const userData = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleId: user.roleId,
        role: user.role ? user.role.name : null,
        externalId: user.externalId,
        username: user.username,
        primaryPhone: user.primaryPhone,
        avatarUrl: user.avatarUrl,
        lastSignInAt: user.lastSignInAt ? user.lastSignInAt.toISO() : null,
        createdAt: user.createdAt.toISO(),
        updatedAt: user.updatedAt ? user.updatedAt.toISO() : null,
      }
      
      // Set proper content type and ensure the response is not empty
      response.header('Content-Type', 'application/json')
      logger.info('Sending user data response')
      return response.json(userData)
    } catch (error) {
      logger.error(`Error fetching user with external ID ${params.externalId}: ${error.message}`)
      return response.status(404).json({ 
        error: 'User not found', 
        message: `No user found with external ID: ${params.externalId}` 
      })
    }
  }
  
  /**
   * Get companies for a user
   * Used by other services to fetch user companies
   */
  public async companies({ params, response, logger }: HttpContext) {
    logger.info(`API: Fetching companies for user with ID ${params.id}`)
    
    try {
      // First try to find the user by primary ID (UUID)
      let user = await User.find(params.id)
      
      // If not found by UUID, try to find by external ID
      if (!user) {
        logger.info(`User not found by UUID, trying external ID lookup for ${params.id}`)
        user = await User.query().where('external_id', params.id).first()
        
        if (!user) {
          logger.error(`User not found with ID or external ID: ${params.id}`)
          return response.status(404).json({ 
            error: 'User not found', 
            message: `No user found with ID or external ID: ${params.id}` 
          })
        }
        
        logger.info(`User found by external ID: ${user.id}, loading companies`)
      } else {
        logger.info(`User found by UUID: ${user.id}, loading companies`)
      }
      
      await user.load('companies')
      
      // Create plain objects for the response to ensure proper serialization
      const companiesData = user.companies.map((company) => {
        return {
          id: company.id,
          name: company.name,
          // Include only properties that exist on the Company model
          // and add isPrimary from the pivot table
          isPrimary: company.$extras.pivot_is_primary === 1,
          createdAt: company.createdAt.toISO(),
          updatedAt: company.updatedAt ? company.updatedAt.toISO() : null,
        }
      })
      
      logger.info(`Found ${companiesData.length} companies for user ${user.id}`)
      
      // Set proper content type and ensure the response is not empty
      response.header('Content-Type', 'application/json')
      return response.json(companiesData)
    } catch (error) {
      logger.error(`Error fetching companies for user ${params.id}: ${error.message}`)
      return response.status(404).json({ 
        error: 'User or companies not found', 
        message: error.message 
      })
    }
  }
}
