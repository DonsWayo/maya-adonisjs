import { inject } from '@adonisjs/core'
import AICostConfig from '../models/ai_cost_config.js'
import { DateTime } from 'luxon'

@inject()
export default class AICostService {
  /**
   * Seed default cost configurations
   */
  async seedDefaultCosts(): Promise<void> {
    const configs = [
      // OpenAI GPT-4
      {
        provider: 'openai',
        model: 'gpt-4',
        operation: 'generate' as const,
        promptCostPer1kCents: 3, // $0.03 per 1K tokens
        completionCostPer1kCents: 6 // $0.06 per 1K tokens
      },
      {
        provider: 'openai',
        model: 'gpt-4-turbo',
        operation: 'generate' as const,
        promptCostPer1kCents: 1, // $0.01 per 1K tokens
        completionCostPer1kCents: 3 // $0.03 per 1K tokens
      },
      // OpenAI GPT-3.5
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        operation: 'generate' as const,
        promptCostPer1kCents: 0.05, // $0.0005 per 1K tokens
        completionCostPer1kCents: 0.15 // $0.0015 per 1K tokens
      },
      // OpenAI Embeddings
      {
        provider: 'openai',
        model: 'text-embedding-ada-002',
        operation: 'embed' as const,
        promptCostPer1kCents: 0.01, // $0.0001 per 1K tokens
        completionCostPer1kCents: 0
      },
      {
        provider: 'openai',
        model: 'text-embedding-3-small',
        operation: 'embed' as const,
        promptCostPer1kCents: 0.002, // $0.00002 per 1K tokens
        completionCostPer1kCents: 0
      },
      {
        provider: 'openai',
        model: 'text-embedding-3-large',
        operation: 'embed' as const,
        promptCostPer1kCents: 0.013, // $0.00013 per 1K tokens
        completionCostPer1kCents: 0
      },
      // Claude 3 Models
      {
        provider: 'anthropic',
        model: 'claude-3-opus',
        operation: 'generate' as const,
        promptCostPer1kCents: 1.5, // $0.015 per 1K tokens
        completionCostPer1kCents: 7.5 // $0.075 per 1K tokens
      },
      {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        operation: 'generate' as const,
        promptCostPer1kCents: 0.3, // $0.003 per 1K tokens
        completionCostPer1kCents: 1.5 // $0.015 per 1K tokens
      },
      {
        provider: 'anthropic',
        model: 'claude-3-haiku',
        operation: 'generate' as const,
        promptCostPer1kCents: 0.025, // $0.00025 per 1K tokens
        completionCostPer1kCents: 0.125 // $0.00125 per 1K tokens
      }
    ]

    for (const config of configs) {
      // Check if config already exists
      const existing = await AICostConfig.query()
        .where('provider', config.provider)
        .where('model', config.model)
        .where('operation', config.operation)
        .whereNull('effectiveTo')
        .first()

      if (!existing) {
        await AICostConfig.create({
          ...config,
          effectiveFrom: DateTime.now(),
          effectiveTo: null
        })
      }
    }
  }

  /**
   * Update cost configuration
   */
  async updateCostConfig(
    provider: string,
    model: string,
    operation: 'generate' | 'embed',
    promptCostPer1kCents: number,
    completionCostPer1kCents: number
  ): Promise<AICostConfig> {
    // End current config
    const current = await AICostConfig.getActiveConfig(provider, model, operation)
    if (current) {
      current.effectiveTo = DateTime.now()
      await current.save()
    }

    // Create new config
    return await AICostConfig.create({
      provider,
      model,
      operation,
      promptCostPer1kCents,
      completionCostPer1kCents,
      effectiveFrom: DateTime.now(),
      effectiveTo: null
    })
  }

  /**
   * Get all active cost configurations
   */
  async getActiveCosts(): Promise<AICostConfig[]> {
    return await AICostConfig.query()
      .whereNull('effectiveTo')
      .orWhere('effectiveTo', '>', DateTime.now().toSQL())
      .orderBy('provider')
      .orderBy('model')
  }
}