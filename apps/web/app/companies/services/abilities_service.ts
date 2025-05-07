import User from '#users/models/user'

import CompanyPolicy from '#companies/policies/company_policy'

export default class AbilitiesService {
  public async getAllAbilities(user: User) {
    return {
      companies: [(await new CompanyPolicy().viewList(user)) && 'read'].filter(Boolean),
    }
  }
}
