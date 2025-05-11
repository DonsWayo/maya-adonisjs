import User from '#users/models/user'

import UserPolicy from '#users/policies/user_policy'
import CompanyPolicy from '#companies/policies/company_policy'

export default class AbilitiesService {
  public async getAllAbilities(user: User) {
    const userPolicy = new UserPolicy()
    const companyPolicy = new CompanyPolicy()
    
    return {
      users: [(await userPolicy.viewList(user)) && 'read'].filter(Boolean),
      companies: [
        (await companyPolicy.viewList(user)) && 'read',
        (await companyPolicy.create(user)) && 'create'
      ].filter(Boolean),
    }
  }
}
