import env from '#start/env'
import type { AIServiceConfig } from '@workspace/ai'

/**
 * AI service configuration
 */
const aiConfig: AIServiceConfig = {
  provider: env.get('AI_PROVIDER', 'openrouter') as AIServiceConfig['provider'],
  apiKey: env.get('AI_API_KEY', ''),
  defaultModel: env.get('AI_DEFAULT_MODEL'),
  ragConfig: {
    vectorStore: 'pgvector',
    connectionString: `postgresql://${env.get('DB_USER')}:${env.get('DB_PASSWORD')}@${env.get('DB_HOST')}:${env.get('DB_PORT')}/${env.get('DB_DATABASE')}`,
    embeddingModel: env.get('AI_EMBEDDING_MODEL', 'text-embedding-3-large'),
    chunkSize: 1000,
    chunkOverlap: 200,
    retrievalLimit: 5,
  },
}

export default aiConfig