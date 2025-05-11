import { createRemoteJWKSet, jwtVerify } from 'jose'
import env from '#start/env'
import managementApiService from './management_api_service.js'
import User from '#users/models/user'
import { LogtoError } from '../types/errors.js'

/**
 * Service for handling Logto RBAC (Role-Based Access Control) operations
 */
export class LogtoRbacService {
  /**
   * JWKS (JSON Web Key Set) for token verification
   */
  private jwks = createRemoteJWKSet(
    new URL(`${env.get('LOGTO_URL')}/oidc/jwks`)
  )

  /**
   * Resource identifier for the API
   */
  private apiResource = 'https://default.logto.app/api'

  /**
   * Maps AdonisJS roles to Logto roles
   */
  private roleMapping = {
    admin: 'admin',
    user: 'user'
  }

  /**
   * Maps AdonisJS permissions to Logto scopes
   */
  private scopeMapping = {
    users: {
      read: 'read:users',
      create: 'create:users',
      update: 'update:users',
      delete: 'delete:users'
    },
    companies: {
      read: 'read:companies',
      create: 'create:companies',
      update: 'update:companies',
      delete: 'delete:companies'
    }
  }

  /**
   * Verifies a JWT token from Logto
   */
  public async verifyToken(token: string) {
    try {
      const { payload } = await jwtVerify(
        token,
        this.jwks,
        {
          issuer: `${env.get('LOGTO_URL')}/oidc`,
          audience: this.apiResource,
        }
      )
      
      return {
        userId: payload.sub as string,
        scopes: payload.scope ? (payload.scope as string).split(' ') : [],
        isValid: true
      }
    } catch (error) {
      console.error('JWT verification error:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Synchronizes a user's AdonisJS role with Logto
   */
  public async syncUserRole(user: User): Promise<void> {
    if (!user.externalId) {
      console.warn(`Cannot sync roles for user ${user.id} without externalId`)
      return
    }

    try {
      // Determine the appropriate Logto role based on user's isAdmin status
      const roleName = user.isAdmin ? this.roleMapping.admin : this.roleMapping.user
      
      // Get current roles from Logto
      const userRoles = await this.getUserRoles(user.externalId)
      
      // Check if the user already has the role
      if (!userRoles.includes(roleName)) {
        // Assign the role in Logto
        await this.assignRoleToUser(user.externalId, roleName)
        console.log(`Assigned role ${roleName} to user ${user.id} in Logto`)
      }
    } catch (error) {
      console.error(`Error syncing roles for user ${user.id}:`, error)
    }
  }

  /**
   * Synchronizes a user's organization roles with Logto
   */
  public async syncUserOrganizationRoles(
    userId: string, 
    organizationId: string, 
    roles: string[]
  ): Promise<void> {
    try {
      // Add user to organization with specified roles
      await managementApiService.addUserToOrganization(
        userId,
        organizationId,
        roles
      )
      console.log(`Synced organization roles for user ${userId} in org ${organizationId}`)
    } catch (error) {
      console.error(`Error syncing organization roles:`, error)
      throw error instanceof LogtoError 
        ? error 
        : new LogtoError('Failed to sync organization roles', error)
    }
  }

  /**
   * Gets a user's current roles from Logto
   */
  private async getUserRoles(logtoUserId: string): Promise<string[]> {
    try {
      const response = await managementApiService.request(
        `/users/${logtoUserId}/roles`, 
        'GET'
      )
      return response.roles?.map((role: any) => role.name) || []
    } catch (error) {
      console.error(`Error getting roles for user ${logtoUserId}:`, error)
      return []
    }
  }

  /**
   * Assigns a role to a user in Logto
   */
  private async assignRoleToUser(logtoUserId: string, roleName: string): Promise<void> {
    try {
      await managementApiService.request(
        `/users/${logtoUserId}/roles`, 
        'POST', 
        { roleNames: [roleName] }
      )
    } catch (error) {
      console.error(`Error assigning role ${roleName} to user ${logtoUserId}:`, error)
      throw error instanceof LogtoError 
        ? error 
        : new LogtoError(`Failed to assign role ${roleName}`, error)
    }
  }

  /**
   * Creates or updates roles in Logto based on AdonisJS permissions
   */
  public async setupRoles(): Promise<void> {
    try {
      // Create admin role with all permissions
      await this.createOrUpdateRole('admin', [
        ...Object.values(this.scopeMapping.users),
        ...Object.values(this.scopeMapping.companies)
      ])
      
      // Create user role with limited permissions
      await this.createOrUpdateRole('user', [
        this.scopeMapping.users.read,
        this.scopeMapping.companies.read,
        this.scopeMapping.companies.create
      ])
      
      console.log('Logto roles setup completed')
    } catch (error) {
      console.error('Error setting up Logto roles:', error)
      throw error instanceof LogtoError 
        ? error 
        : new LogtoError('Failed to setup roles', error)
    }
  }

  /**
   * Creates or updates a role in Logto
   */
  private async createOrUpdateRole(name: string, scopes: string[]): Promise<void> {
    try {
      // Check if role exists
      const roles = await managementApiService.request('/roles', 'GET')
      const existingRole = roles.find((role: any) => role.name === name)
      
      if (existingRole) {
        // Update existing role
        await managementApiService.request(
          `/roles/${existingRole.id}`, 
          'PATCH', 
          { 
            name,
            description: `${name.charAt(0).toUpperCase() + name.slice(1)} role for the application`,
            scopes 
          }
        )
        console.log(`Updated role ${name} in Logto`)
      } else {
        // Create new role
        await managementApiService.request(
          '/roles', 
          'POST', 
          { 
            name,
            description: `${name.charAt(0).toUpperCase() + name.slice(1)} role for the application`,
            scopes 
          }
        )
        console.log(`Created role ${name} in Logto`)
      }
    } catch (error) {
      console.error(`Error creating/updating role ${name}:`, error)
      throw error instanceof LogtoError 
        ? error 
        : new LogtoError(`Failed to create/update role ${name}`, error)
    }
  }
}

export default new LogtoRbacService()
