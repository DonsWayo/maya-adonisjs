import { BasePolicy } from '@adonisjs/bouncer'
import { AuthorizerResponse } from '@adonisjs/bouncer/types'

import User from '#users/models/user'
import Company from '#companies/models/company'

export default class CompanyPolicy extends BasePolicy {
  viewList(currentUser: User): AuthorizerResponse {
    return currentUser.isAdmin
  }

  async view(currentUser: User, company: Company): Promise<AuthorizerResponse> {
    // Admin can view any company
    if (currentUser.isAdmin) {
      return true
    }
    
    // Owner can view their own company
    if (company.ownerId === currentUser.id) {
      return true
    }
    
    // Check if user belongs to this company using the ORM relationship
    await currentUser.load('companies', (query) => {
      query.where('id', company.id)
    })
    
    return currentUser.companies.length > 0
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
    
    // Owner can update their own company
    return company.ownerId === currentUser.id
  }

  delete(currentUser: User, _company: Company): AuthorizerResponse {
    return currentUser.isAdmin
  }
}
