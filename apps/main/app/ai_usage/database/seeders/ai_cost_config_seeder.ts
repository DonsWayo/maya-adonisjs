import { BaseSeeder } from '@adonisjs/lucid/seeders'
import AICostService from '../../services/ai_cost_service.js'

export default class extends BaseSeeder {
  async run() {
    const aiCostService = new AICostService()
    await aiCostService.seedDefaultCosts()
  }
}