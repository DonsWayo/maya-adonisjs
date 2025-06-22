import vine from '@vinejs/vine'
import type { AIServiceConfig } from '../types/index.js'

/**
 * Validator for AI configuration
 */
export const aiConfigSchema = vine.object({
  provider: vine.enum(['openrouter', 'openai', 'anthropic', 'google', 'local']),
  apiKey: vine.string().minLength(1),
  baseURL: vine.string().url().optional(),
  defaultModel: vine.string().optional(),
  ragConfig: vine.object({
    vectorStore: vine.enum(['pgvector', 'pinecone', 'qdrant', 'memory']),
    connectionString: vine.string().optional(),
    embeddingModel: vine.string().optional(),
    chunkSize: vine.number().optional(),
    chunkOverlap: vine.number().optional(),
    retrievalLimit: vine.number().optional(),
  }).optional(),
})

export const aiConfigValidator = vine.compile(aiConfigSchema)

/**
 * Type-safe validation function
 */
export async function validateAIConfig(config: unknown): Promise<AIServiceConfig> {
  return await aiConfigValidator.validate(config) as AIServiceConfig
}