export interface AIUsageStats {
  totalRequests: number
  totalTokens: number
  totalCostCents: number
  averageLatencyMs: number
  successRate: number
  errorRate: number
}

export interface AIUsageByProvider {
  provider: string
  requests: number
  tokens: number
  costCents: number
}

export interface AIUsageByModel {
  model: string
  requests: number
  tokens: number
  costCents: number
}

export interface AIUsageByFeature {
  feature: string
  requests: number
  tokens: number
  costCents: number
}

export interface AIUsageSummary {
  stats: AIUsageStats
  byProvider: AIUsageByProvider[]
  byModel: AIUsageByModel[]
  byFeature: AIUsageByFeature[]
  timeline: {
    date: string
    requests: number
    tokens: number
    costCents: number
  }[]
}

export interface RecordUsageData {
  companyId: string
  userId?: string
  projectId?: string
  appName: string
  provider: string
  model: string
  operation: 'generate' | 'embed' | 'extract' | 'stream'
  promptTokens: number
  completionTokens?: number
  latencyMs?: number
  success?: boolean
  errorMessage?: string
  feature?: string
  prompt?: string
  completion?: string
  metadata?: Record<string, any>
}

export interface CostConfiguration {
  provider: string
  model: string
  promptCostPer1kTokens: number
  completionCostPer1kTokens: number
}