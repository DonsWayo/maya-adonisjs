/**
 * AI Provider types
 */
export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'google' | 'local'

/**
 * Latest model configurations (December 2024 / 2025)
 */
export const LATEST_MODELS = {
  openrouter: {
    fast: 'meta-llama/llama-3.2-3b-instruct',          // ~$0.06/M tokens
    balanced: 'mistral/mistral-7b-instruct',           // ~$0.07/M tokens  
    powerful: 'anthropic/claude-3.5-sonnet',           // ~$3/M tokens
    reasoning: 'openai/gpt-4o-mini',                   // ~$0.15/M tokens
    embedding: 'text-embedding-3-small'                // ~$0.02/M tokens
  },
  google: {
    fast: 'gemini-2.0-flash',
    balanced: 'gemini-2.5-pro',
    powerful: 'gemini-2.5-pro',
    embedding: 'text-embedding-004'
  },
  anthropic: {
    fast: 'claude-3-5-haiku-20241022',
    balanced: 'claude-3-5-sonnet-20241022',
    powerful: 'claude-3-5-sonnet-20241022'
  },
  openai: {
    fast: 'gpt-4o-mini',
    balanced: 'gpt-4o',
    powerful: 'o1-pro',
    embedding: 'text-embedding-3-large'
  }
} as const

/**
 * Configuration for AI service
 */
export interface AIServiceConfig {
  provider: AIProvider
  apiKey: string
  baseURL?: string
  defaultModel?: string
  ragConfig?: RAGConfig
}

/**
 * RAG (Retrieval Augmented Generation) configuration
 */
export interface RAGConfig {
  vectorStore: 'pgvector' | 'pinecone' | 'qdrant' | 'memory'
  connectionString?: string
  embeddingModel?: string
  chunkSize?: number
  chunkOverlap?: number
  retrievalLimit?: number
}

/**
 * Context for RAG queries
 */
export interface RAGContext {
  namespace: string // e.g., 'errors', 'tickets', 'documentation'
  filters?: Record<string, any>
  includeMetadata?: boolean
  minSimilarity?: number
}

/**
 * Document for vector storage
 */
export interface Document {
  id: string
  content: string
  metadata: {
    source: string
    type: string // 'code', 'error', 'ticket', 'documentation', etc.
    projectId?: string
    timestamp?: Date
    [key: string]: any
  }
  embedding?: number[]
}

/**
 * Core AI service interface
 */
export interface AIService {
  // Basic generation
  generate(prompt: string, options?: GenerateOptions): Promise<string>
  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>
  
  // RAG operations
  addDocuments(documents: Document[]): Promise<void>
  search(query: string, context: RAGContext): Promise<Document[]>
  generateWithContext(prompt: string, context: RAGContext, options?: GenerateOptions): Promise<string>
  
  // Embeddings
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  
  // Structured extraction
  extract<T>(text: string, schema: any): Promise<T>
}

/**
 * Generation options
 */
export interface GenerateOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  format?: 'text' | 'json' | 'markdown'
}

/**
 * Use case specific interfaces for different apps
 */

// For monitoring app
export interface ErrorAnalysis {
  summary: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  possibleCauses: string[]
  suggestedFixes: {
    description: string
    code?: string
    confidence: number
  }[]
  relatedErrors?: string[]
}

// For ticketing app
export interface TicketAnalysis {
  priority: 'urgent' | 'high' | 'normal' | 'low'
  category: string
  suggestedAssignee?: string
  estimatedTime?: string
  similarTickets?: string[]
  suggestedResponse?: string
}

// For project management (Jira-like)
export interface IssueAnalysis {
  type: 'bug' | 'feature' | 'task' | 'improvement'
  complexity: 'trivial' | 'minor' | 'major' | 'critical'
  suggestedLabels: string[]
  dependencies?: string[]
  acceptanceCriteria?: string[]
}

// For status page
export interface IncidentAnalysis {
  impact: 'none' | 'minor' | 'major' | 'critical'
  affectedServices: string[]
  rootCause?: string
  statusMessage: string
  estimatedResolution?: string
}