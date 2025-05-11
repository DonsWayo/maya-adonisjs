import User from '#users/models/user'

import CompanyPolicy from '#companies/policies/company_policy'

export default class AbilitiesService {
  public async getAllAbilities(user: User) {
    const companyPolicy = new CompanyPolicy()
    
    return {
      companies: [
        (await companyPolicy.viewList(user)) && 'read',
        (await companyPolicy.create(user)) && 'create'
      ].filter(Boolean),
    }
  }
}
