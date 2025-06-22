import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import emitter from '@adonisjs/core/services/emitter'
import AIUsage from '../models/ai_usage.js'
import AIUsageLimit from '../models/ai_usage_limit.js'
import AICostConfig from '../models/ai_cost_config.js'
import type { RecordUsageData, AIUsageSummary } from '../types/index.js'

@inject()
export default class AIUsageService {
  /**
   * Record AI usage with cost calculation
   */
  async recordUsage(data: RecordUsageData): Promise<AIUsage> {
    // Get cost configuration
    const costConfig = await AICostConfig.getActiveConfig(
      data.provider,
      data.model,
      data.operation === 'embed' ? 'embed' : 'generate'
    )

    // Calculate costs
    let promptCostCents = 0
    let completionCostCents = 0
    let totalCostCents = 0

    if (costConfig) {
      const costs = costConfig.calculateCost(
        data.promptTokens,
        data.completionTokens || 0
      )
      promptCostCents = costs.promptCostCents
      completionCostCents = costs.completionCostCents
      totalCostCents = costs.totalCostCents
    }

    // Create usage record
    const usage = await AIUsage.create({
      companyId: data.companyId,
      userId: data.userId,
      projectId: data.projectId,
      appName: data.appName,
      provider: data.provider,
      model: data.model,
      operation: data.operation,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens || 0,
      totalTokens: data.promptTokens + (data.completionTokens || 0),
      promptCostCents,
      completionCostCents,
      totalCostCents,
      currency: 'USD',
      latencyMs: data.latencyMs,
      cached: false,
      success: data.success !== false,
      errorMessage: data.errorMessage,
      feature: data.feature,
      prompt: data.prompt,
      completion: data.completion,
      metadata: data.metadata
    })

    // Update limits
    await this.updateUsageLimits(usage)

    // Emit event
    await emitter.emit('ai_usage:recorded', {
      usage,
      companyId: data.companyId,
      userId: data.userId
    })

    return usage
  }

  /**
   * Update usage limits for a company
   */
  private async updateUsageLimits(usage: AIUsage): Promise<void> {
    const limits = await AIUsageLimit.query()
      .where('companyId', usage.companyId)
      .where('periodEnd', '>', DateTime.now().toSQL())

    for (const limit of limits) {
      // Reset if period expired
      if (limit.isPeriodExpired()) {
        await this.resetLimitPeriod(limit)
        continue
      }

      // Update current usage
      limit.currentRequests += 1
      limit.currentTokens += usage.totalTokens
      limit.currentCostCents += usage.totalCostCents

      await limit.save()

      // Check if limit exceeded
      if (limit.isLimitExceeded()) {
        const limitType = this.getExceededLimitType(limit)
        await emitter.emit('ai_usage:limit_exceeded', {
          usage,
          limit,
          limitType
        })
      } 
      // Check if warning threshold reached
      else if (limit.isWarningThresholdReached() && !limit.warningSent) {
        const percentage = this.getHighestUsagePercentage(limit)
        const limitType = this.getHighestUsageLimitType(limit)
        
        limit.warningSent = true
        await limit.save()

        await emitter.emit('ai_usage:limit_warning', {
          limit,
          percentage,
          limitType
        })
      }
    }
  }

  /**
   * Reset limit period when expired
   */
  private async resetLimitPeriod(limit: AIUsageLimit): Promise<void> {
    const now = DateTime.now()
    
    switch (limit.period) {
      case 'daily':
        limit.periodStart = now.startOf('day')
        limit.periodEnd = now.endOf('day')
        break
      case 'weekly':
        limit.periodStart = now.startOf('week')
        limit.periodEnd = now.endOf('week')
        break
      case 'monthly':
        limit.periodStart = now.startOf('month')
        limit.periodEnd = now.endOf('month')
        break
    }

    limit.currentRequests = 0
    limit.currentTokens = 0
    limit.currentCostCents = 0
    limit.warningSent = false

    await limit.save()
  }

  /**
   * Get exceeded limit type
   */
  private getExceededLimitType(limit: AIUsageLimit): 'requests' | 'tokens' | 'cost' {
    if (limit.maxRequests && limit.currentRequests >= limit.maxRequests) return 'requests'
    if (limit.maxTokens && limit.currentTokens >= limit.maxTokens) return 'tokens'
    return 'cost'
  }

  /**
   * Get highest usage percentage
   */
  private getHighestUsagePercentage(limit: AIUsageLimit): number {
    const percentages = limit.getUsagePercentage()
    return Math.max(
      percentages.requests || 0,
      percentages.tokens || 0,
      percentages.cost || 0
    )
  }

  /**
   * Get highest usage limit type
   */
  private getHighestUsageLimitType(limit: AIUsageLimit): 'requests' | 'tokens' | 'cost' {
    const percentages = limit.getUsagePercentage()
    let highest: 'requests' | 'tokens' | 'cost' = 'requests'
    let highestValue = percentages.requests || 0

    if ((percentages.tokens || 0) > highestValue) {
      highest = 'tokens'
      highestValue = percentages.tokens || 0
    }

    if ((percentages.cost || 0) > highestValue) {
      highest = 'cost'
    }

    return highest
  }

  /**
   * Get usage summary for a company
   */
  async getUsageSummary(
    companyId: string,
    startDate: DateTime,
    endDate: DateTime
  ): Promise<AIUsageSummary> {
    const usages = await AIUsage.query()
      .where('companyId', companyId)
      .whereBetween('createdAt', [startDate.toSQL()!, endDate.toSQL()!])
      .orderBy('createdAt', 'desc')

    // Calculate stats
    const stats = {
      totalRequests: usages.length,
      totalTokens: 0,
      totalCostCents: 0,
      averageLatencyMs: 0,
      successRate: 0,
      errorRate: 0
    }

    const byProvider = new Map<string, any>()
    const byModel = new Map<string, any>()
    const byFeature = new Map<string, any>()
    const timeline = new Map<string, any>()

    let totalLatency = 0
    let latencyCount = 0
    let successCount = 0

    for (const usage of usages) {
      stats.totalTokens += usage.totalTokens
      stats.totalCostCents += usage.totalCostCents

      if (usage.latencyMs) {
        totalLatency += usage.latencyMs
        latencyCount++
      }

      if (usage.success) successCount++

      // By provider
      const providerKey = usage.provider
      if (!byProvider.has(providerKey)) {
        byProvider.set(providerKey, { provider: providerKey, requests: 0, tokens: 0, costCents: 0 })
      }
      const providerData = byProvider.get(providerKey)
      providerData.requests++
      providerData.tokens += usage.totalTokens
      providerData.costCents += usage.totalCostCents

      // By model
      const modelKey = usage.model
      if (!byModel.has(modelKey)) {
        byModel.set(modelKey, { model: modelKey, requests: 0, tokens: 0, costCents: 0 })
      }
      const modelData = byModel.get(modelKey)
      modelData.requests++
      modelData.tokens += usage.totalTokens
      modelData.costCents += usage.totalCostCents

      // By feature
      const featureKey = usage.feature || 'unknown'
      if (!byFeature.has(featureKey)) {
        byFeature.set(featureKey, { feature: featureKey, requests: 0, tokens: 0, costCents: 0 })
      }
      const featureData = byFeature.get(featureKey)
      featureData.requests++
      featureData.tokens += usage.totalTokens
      featureData.costCents += usage.totalCostCents

      // Timeline
      const dateKey = usage.createdAt.toFormat('yyyy-MM-dd')
      if (!timeline.has(dateKey)) {
        timeline.set(dateKey, { date: dateKey, requests: 0, tokens: 0, costCents: 0 })
      }
      const timelineData = timeline.get(dateKey)
      timelineData.requests++
      timelineData.tokens += usage.totalTokens
      timelineData.costCents += usage.totalCostCents
    }

    // Calculate averages
    if (latencyCount > 0) {
      stats.averageLatencyMs = Math.round(totalLatency / latencyCount)
    }

    if (usages.length > 0) {
      stats.successRate = (successCount / usages.length) * 100
      stats.errorRate = 100 - stats.successRate
    }

    return {
      stats,
      byProvider: Array.from(byProvider.values()),
      byModel: Array.from(byModel.values()),
      byFeature: Array.from(byFeature.values()),
      timeline: Array.from(timeline.values()).sort((a, b) => a.date.localeCompare(b.date))
    }
  }

  /**
   * Check if company can make AI request
   */
  async canMakeRequest(companyId: string): Promise<{
    allowed: boolean
    reason?: string
    limits?: AIUsageLimit[]
  }> {
    const limits = await AIUsageLimit.query()
      .where('companyId', companyId)
      .where('periodEnd', '>', DateTime.now().toSQL())

    const exceededLimits = limits.filter(limit => limit.isLimitExceeded())

    if (exceededLimits.length > 0) {
      const reasons = exceededLimits.map(limit => {
        const limitType = this.getExceededLimitType(limit)
        return `${limit.period} ${limitType} limit exceeded`
      })

      return {
        allowed: false,
        reason: reasons.join(', '),
        limits: exceededLimits
      }
    }

    return { allowed: true }
  }

  /**
   * Set usage limits for a company
   */
  async setUsageLimits(
    companyId: string,
    period: 'daily' | 'weekly' | 'monthly',
    limits: {
      maxRequests?: number
      maxTokens?: number
      maxCostCents?: number
      warningThresholdPercent?: number
    }
  ): Promise<AIUsageLimit> {
    const now = DateTime.now()
    let periodStart: DateTime
    let periodEnd: DateTime

    switch (period) {
      case 'daily':
        periodStart = now.startOf('day')
        periodEnd = now.endOf('day')
        break
      case 'weekly':
        periodStart = now.startOf('week')
        periodEnd = now.endOf('week')
        break
      case 'monthly':
        periodStart = now.startOf('month')
        periodEnd = now.endOf('month')
        break
    }

    const existingLimit = await AIUsageLimit.query()
      .where('companyId', companyId)
      .where('period', period)
      .first()

    if (existingLimit) {
      existingLimit.merge({
        maxRequests: limits.maxRequests ?? existingLimit.maxRequests,
        maxTokens: limits.maxTokens ?? existingLimit.maxTokens,
        maxCostCents: limits.maxCostCents ?? existingLimit.maxCostCents,
        warningThresholdPercent: limits.warningThresholdPercent ?? existingLimit.warningThresholdPercent
      })
      await existingLimit.save()
      return existingLimit
    }

    return await AIUsageLimit.create({
      companyId,
      period,
      maxRequests: limits.maxRequests || null,
      maxTokens: limits.maxTokens || null,
      maxCostCents: limits.maxCostCents || null,
      warningThresholdPercent: limits.warningThresholdPercent || 80,
      currentRequests: 0,
      currentTokens: 0,
      currentCostCents: 0,
      periodStart,
      periodEnd,
      warningSent: false
    })
  }
}