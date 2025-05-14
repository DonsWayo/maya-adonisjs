import router from '@adonisjs/core/services/router'
import apiResourceService from '#auth/logto/services/api_resource_service'

// Route to verify API resource scopes
router.get('/api/logto/verify-scopes', async ({ response }) => {
  const result = await apiResourceService.verifyApiResourceScopes()
  return response.json(result)
})
