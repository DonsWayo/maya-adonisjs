import { BasePolicy } from '@adonisjs/bouncer'
import { AuthorizerResponse } from '@adonisjs/bouncer/types'

import User from '#users/models/user'
import Company from '#companies/models/company'

export default class CompanyPolicy extends BasePolicy {
  viewList(currentUser: User): AuthorizerResponse {
    return currentUser.isAdmin
  }

  view(currentUser: User, company: Company): AuthorizerResponse {
    // Admin can view any company
    if (currentUser.isAdmin) {
      return true
    }
    
    // For non-admin users, we need to check if they belong to this company
    // This requires the companies relationship to be preloaded before calling this method
    if (!currentUser.companies) {
      console.warn('User companies relationship not preloaded, defaulting to false')
      return false
    }
    
    return currentUser.companies.some(c => c.id === company.id)
  }

  create(_currentUser: User): AuthorizerResponse {
    // Allow any authenticated user to create a company
    return true
  }

  update(currentUser: User, company: Company): AuthorizerResponse {
    // Admin can update any company
    if (currentUser.isAdmin) {
      return true
    }
    
    // For non-admin users, we need to check if they are an admin of this company
    // This requires the companies relationship to be preloaded before calling this method
    if (!currentUser.companies) {
      console.warn('User companies relationship not preloaded, defaulting to false')
      return false
    }
    
    // Check if the user has an admin role in this company
    return currentUser.companies.some(c => {
      return c.id === company.id && c.$extras.pivot_role === 'admin'
    })
  }

  delete(currentUser: User, _company: Company): AuthorizerResponse {
    return currentUser.isAdmin
  }
}
