import { openai, createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText, generateObject, embed } from 'ai'
import { z } from 'zod'
import type { AIService, AIServiceConfig, GenerateOptions, Document, RAGContext } from '../types/index.js'
import { PgAIVectorStore } from '../vector-stores/pgai.js'

export class OpenAIService implements AIService {
  private vectorStore?: PgAIVectorStore
  private defaultModel: string
  private embeddingModelName: string
  private openaiProvider: ReturnType<typeof createOpenAI>
  private embeddingProvider: ReturnType<typeof createOpenAI>

  constructor(config: AIServiceConfig) {
    // Create OpenAI provider with configuration
    this.openaiProvider = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })
    
    // Create a separate provider for embeddings (always use OpenAI for embeddings)
    this.embeddingProvider = createOpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    })
    
    this.defaultModel = config.defaultModel || 'gpt-4o-mini'
    this.embeddingModelName = config.ragConfig?.embeddingModel || 'text-embedding-3-small'

    if (config.ragConfig?.vectorStore === 'pgvector' && config.ragConfig.connectionString) {
      this.vectorStore = new PgAIVectorStore({
        connectionString: config.ragConfig.connectionString,
        embeddingModel: this.embeddingModelName,
      })
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = this.openaiProvider(options?.model || this.defaultModel)
    const { text } = await generateText({
      model: model,
      prompt: options?.systemPrompt ? `${options.systemPrompt}\n\n${prompt}` : prompt,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    })

    return text
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const model = this.openaiProvider(options?.model || this.defaultModel)
    const result = await streamText({
      model: model,
      prompt: options?.systemPrompt ? `${options.systemPrompt}\n\n${prompt}` : prompt,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    })

    for await (const chunk of result.textStream) {
      yield chunk
    }
  }

  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured')
    }

    // Generate embeddings for documents
    const documentsWithEmbeddings = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        embedding: await this.embed(doc.content),
      }))
    )

    await this.vectorStore.addDocuments(documentsWithEmbeddings)
  }

  async search(query: string, context: RAGContext): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured')
    }

    const queryEmbedding = await this.embed(query)
    return this.vectorStore.search(queryEmbedding, context)
  }

  async generateWithContext(
    prompt: string,
    context: RAGContext,
    options?: GenerateOptions
  ): Promise<string> {
    // Search for relevant documents
    const relevantDocs = await this.search(prompt, context)

    // Build context from documents
    const contextText = relevantDocs
      .map((doc) => `[${doc.metadata.type}] ${doc.metadata.source}:\n${doc.content}`)
      .join('\n\n---\n\n')

    // Generate with context
    const enhancedPrompt = `Context:\n${contextText}\n\nQuery: ${prompt}`

    return this.generate(enhancedPrompt, {
      ...options,
      systemPrompt: options?.systemPrompt || 'You are a helpful AI assistant. Use the provided context to answer the query accurately.',
    })
  }

  async embed(text: string): Promise<number[]> {
    const embeddingModel = this.embeddingProvider.embedding(this.embeddingModelName)
    const { embedding } = await embed({
      model: embeddingModel,
      value: text,
    })

    return embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(texts.map((text) => this.embed(text)))
    return embeddings
  }

  async extract<T>(text: string, schema: z.ZodSchema<T>): Promise<T> {
    const model = this.openaiProvider(this.defaultModel)
    const { object } = await generateObject({
      model: model,
      prompt: text,
      schema,
    })

    return object as T
  }
}