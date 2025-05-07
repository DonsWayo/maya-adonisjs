/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const CompaniesController = () => import('#companies/controllers/companies_controller')

router
  .resource('/companies', CompaniesController)
  .only(['index', 'store', 'show', 'update', 'destroy'])
  .use('*', middleware.auth())
