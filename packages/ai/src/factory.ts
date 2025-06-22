import type { AIService, AIServiceConfig } from './types/index.js'
import { OpenAIService } from './providers/openai.js'
import { validateAIConfig } from './validators/config.js'

/**
 * Factory function to create AI service instances
 */
export async function createAIService(config: AIServiceConfig): Promise<AIService> {
  // Validate configuration
  await validateAIConfig(config)

  switch (config.provider) {
    case 'openai':
      return new OpenAIService(config)
    
    case 'openrouter':
      // OpenRouter uses OpenAI-compatible API, so we can use OpenAI provider with custom baseURL
      console.warn('OpenRouter provider does not support embeddings. Using OpenAI provider with custom baseURL. Please ensure OPENAI_API_KEY is set for embeddings.')
      return new OpenAIService({
        ...config,
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      })
    
    case 'anthropic':
      // TODO: Implement Anthropic provider
      throw new Error('Anthropic provider not yet implemented')
    
    case 'google':
      // TODO: Implement Google provider
      throw new Error('Google provider not yet implemented')
    
    case 'local':
      // TODO: Implement local provider (Ollama, etc.)
      throw new Error('Local provider not yet implemented')
    
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

/**
 * Create a pgai-powered AI service with RAG capabilities
 */
export async function createRAGService(config: AIServiceConfig & {
  pgConnectionString: string
}): Promise<AIService> {
  return createAIService({
    ...config,
    ragConfig: {
      vectorStore: 'pgvector',
      connectionString: config.pgConnectionString,
      embeddingModel: config.ragConfig?.embeddingModel,
      chunkSize: config.ragConfig?.chunkSize || 1000,
      chunkOverlap: config.ragConfig?.chunkOverlap || 200,
      retrievalLimit: config.ragConfig?.retrievalLimit || 5,
    }
  })
}