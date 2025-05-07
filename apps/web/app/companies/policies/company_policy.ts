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
    
    // Owner can view their own company
    if (company.ownerId === currentUser.id) {
      return true
    }
    
    // User can view company they belong to
    return currentUser.companyId === company.id
  }

  create(currentUser: User): AuthorizerResponse {
    return currentUser.isAdmin
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
