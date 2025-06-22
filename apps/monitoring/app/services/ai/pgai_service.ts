import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import type { ErrorEvent } from '#error/models/error_event'

/**
 * Service that uses pgai's native PostgreSQL functions
 * This provides direct integration with pgai without external dependencies
 */
@inject()
export default class PgAIService {
  /**
   * Initialize pgai configuration
   */
  async initialize(): Promise<void> {
    try {
      // Check if AI extension is installed
      const result = await db.rawQuery(
        "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'ai')"
      )
      
      if (!result.rows[0].exists) {
        logger.warn('pgai extension not installed, AI features will be limited')
        return
      }

      // Set OpenAI API key if available
      const apiKey = process.env.AI_API_KEY
      if (apiKey && apiKey.includes('sk-or-')) {
        // OpenRouter uses OpenAI-compatible API
        await db.rawQuery(
          "SELECT set_config('ai.openai_api_key', ?, false)",
          [apiKey]
        )
        await db.rawQuery(
          "SELECT set_config('ai.openai_base_url', 'https://openrouter.ai/api/v1', false)"
        )
      }

      logger.info('pgai service initialized')
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize pgai')
    }
  }

  /**
   * Generate embeddings using pgai
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const result = await db.rawQuery(
        "SELECT ai.openai_embed('text-embedding-3-small', ?) as embedding",
        [text]
      )
      
      return result.rows[0]?.embedding
    } catch (error) {
      logger.error({ err: error }, 'Failed to generate embedding')
      return null
    }
  }

  /**
   * Analyze error using pgai's LLM functions
   */
  async analyzeError(error: ErrorEvent): Promise<any> {
    try {
      const prompt = `
Analyze this error and provide insights:
Type: ${error.type}
Message: ${error.message}
Platform: ${error.platform}
Environment: ${error.environment}
${error.stack_trace ? `Stack Trace: ${error.stack_trace.substring(0, 1000)}` : ''}

Provide a JSON response with:
- summary: Brief summary of the error
- severity: critical/high/medium/low
- category: Type of error
- possibleCauses: Array of possible causes
- suggestedFixes: Array of fixes with description and confidence
`

      // Use pgai's generate function with a cheaper model
      const result = await db.rawQuery(
        `SELECT ai.openai_generate(
          'mistral-7b-instruct',
          jsonb_build_object(
            'messages', jsonb_build_array(
              jsonb_build_object(
                'role', 'system',
                'content', 'You are an expert software engineer analyzing errors. Respond only with valid JSON.'
              ),
              jsonb_build_object(
                'role', 'user',
                'content', ?
              )
            ),
            'temperature', 0.7,
            'response_format', jsonb_build_object('type', 'json_object')
          )
        ) as analysis`,
        [prompt]
      )

      const response = result.rows[0]?.analysis
      return response ? JSON.parse(response.choices[0].message.content) : null
    } catch (error) {
      logger.error({ err: error }, 'Failed to analyze error with pgai')
      return null
    }
  }

  /**
   * Create a vectorizer for automatic embedding generation
   */
  async createErrorVectorizer(): Promise<void> {
    try {
      // Create a vectorizer that automatically generates embeddings for errors
      await db.rawQuery(`
        SELECT ai.create_vectorizer(
          'ai_documents',
          source => ai.source_table(
            table_name => 'ai_documents',
            columns => array['content'],
            where_clause => 'namespace = ''errors'''
          ),
          embedding => ai.embedding_openai(
            model => 'text-embedding-3-small',
            dimensions => 1536
          ),
          processing => ai.processing_default()
        );
      `)

      logger.info('Error vectorizer created')
    } catch (error) {
      if (error.message?.includes('already exists')) {
        logger.debug('Vectorizer already exists')
      } else {
        logger.error({ err: error }, 'Failed to create vectorizer')
      }
    }
  }

  /**
   * Perform semantic search using pgai
   */
  async semanticSearch(
    query: string,
    namespace: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const result = await db.rawQuery(
        `
        WITH query_embedding AS (
          SELECT ai.openai_embed('text-embedding-3-small', ?) as embedding
        )
        SELECT 
          d.id,
          d.content,
          d.metadata,
          1 - (d.embedding <=> q.embedding) as similarity
        FROM ai_documents d, query_embedding q
        WHERE d.namespace = ?
          AND 1 - (d.embedding <=> q.embedding) > 0.7
        ORDER BY d.embedding <=> q.embedding
        LIMIT ?
        `,
        [query, namespace, limit]
      )

      return result.rows
    } catch (error) {
      logger.error({ err: error }, 'Failed to perform semantic search')
      return []
    }
  }

  /**
   * Use pgai's RAG capabilities
   */
  async generateWithRAG(
    query: string,
    namespace: string
  ): Promise<string | null> {
    try {
      const result = await db.rawQuery(
        `
        WITH context_docs AS (
          SELECT string_agg(content, E'\\n\\n') as context
          FROM (
            WITH query_embedding AS (
              SELECT ai.openai_embed('text-embedding-3-small', ?) as embedding
            )
            SELECT content
            FROM ai_documents d, query_embedding q
            WHERE d.namespace = ?
            ORDER BY d.embedding <=> q.embedding
            LIMIT 5
          ) relevant_docs
        )
        SELECT ai.openai_generate(
          'mistral-7b-instruct',
          jsonb_build_object(
            'messages', jsonb_build_array(
              jsonb_build_object(
                'role', 'system',
                'content', 'Answer based on the provided context. Be concise and helpful.'
              ),
              jsonb_build_object(
                'role', 'user',
                'content', 'Context: ' || context || E'\\n\\nQuestion: ' || ?
              )
            )
          )
        )->'choices'->0->'message'->>'content' as response
        FROM context_docs
        `,
        [query, namespace, query]
      )

      return result.rows[0]?.response
    } catch (error) {
      logger.error({ err: error }, 'Failed to generate with RAG')
      return null
    }
  }
}