# @workspace/ai

Shared AI package for Maya AdonisJS monorepo. Provides unified AI capabilities with RAG (Retrieval Augmented Generation) support using pgai and multiple LLM providers.

## Features

- 🤖 Multiple AI providers (OpenRouter, OpenAI, Anthropic, Google)
- 🔍 RAG with pgai/pgvector integration
- 📊 Structured data extraction
- 🎯 Use-case specific analysis (errors, tickets, issues, incidents)
- 🚀 Latest models (Gemini 2.5, Claude 3.5, GPT-4o, o1-pro)
- 💾 Vector storage and semantic search
- 🔄 Streaming responses

## Installation

```bash
pnpm add @workspace/ai
```

## Quick Start

### Basic Usage

```typescript
import { createAIService } from '@workspace/ai'

// Create AI service
const ai = await createAIService({
  provider: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultModel: 'anthropic/claude-3.5-sonnet'
})

// Generate text
const response = await ai.generate('Explain quantum computing in simple terms')

// Stream responses
for await (const chunk of ai.generateStream('Write a story about AI')) {
  console.log(chunk)
}
```

### RAG with pgai

```typescript
import { createRAGService } from '@workspace/ai'

// Create AI service with RAG capabilities
const ai = await createRAGService({
  provider: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY!,
  pgConnectionString: process.env.DATABASE_URL!
})

// Add documents to vector store
await ai.addDocuments([
  {
    id: 'doc1',
    content: 'AdonisJS is a Node.js framework...',
    metadata: {
      source: 'documentation',
      type: 'framework',
      projectId: 'adonis-docs'
    }
  }
])

// Search with context
const docs = await ai.search('How to use AdonisJS?', {
  namespace: 'documentation',
  filters: { projectId: 'adonis-docs' }
})

// Generate with RAG context
const answer = await ai.generateWithContext(
  'How do I create a controller in AdonisJS?',
  { namespace: 'documentation' }
)
```

## Use Cases

### Error Analysis (Monitoring App)

```typescript
import { analyzeError } from '@workspace/ai/utils'

const analysis = await analyzeError(ai, {
  message: 'Cannot read property "id" of undefined',
  type: 'TypeError',
  stackTrace: '...',
  context: { url: '/api/users', method: 'GET' }
})

console.log(analysis)
// {
//   summary: "Attempting to access 'id' property on undefined object",
//   severity: "high",
//   category: "runtime",
//   possibleCauses: [...],
//   suggestedFixes: [...]
// }
```

### Ticket Analysis (Support App)

```typescript
import { analyzeTicket } from '@workspace/ai/utils'

const analysis = await analyzeTicket(ai, {
  title: 'Login not working',
  description: 'I cannot log in to my account...',
  customerInfo: { tier: 'premium' }
})
```

### Issue Analysis (Project Management)

```typescript
import { analyzeIssue } from '@workspace/ai/utils'

const analysis = await analyzeIssue(ai, {
  title: 'Add dark mode support',
  description: 'Users want a dark theme option...'
})
```

### Incident Analysis (Status Page)

```typescript
import { analyzeIncident } from '@workspace/ai/utils'

const analysis = await analyzeIncident(ai, {
  description: 'Database connection timeouts',
  affectedSystems: ['api', 'dashboard'],
  metrics: { errorRate: 0.15 }
})
```

## Configuration

### Available Models

```typescript
import { LATEST_MODELS } from '@workspace/ai'

// OpenRouter models
LATEST_MODELS.openrouter.fast      // gemini-2.0-flash-exp:free
LATEST_MODELS.openrouter.balanced   // claude-3.5-sonnet
LATEST_MODELS.openrouter.powerful   // gemini-2.5-pro-exp
LATEST_MODELS.openrouter.reasoning  // o1-pro
```

### pgai Setup

1. Install pgai extension:
```sql
CREATE EXTENSION IF NOT EXISTS pgai CASCADE;
CREATE EXTENSION IF NOT EXISTS vector CASCADE;
```

2. Run migrations to create vector tables
3. Configure vectorizer for automatic embeddings

## Advanced Usage

### Custom Prompts

```typescript
const result = await ai.generate('Analyze this code', {
  systemPrompt: 'You are an expert code reviewer',
  temperature: 0.7,
  maxTokens: 2000
})
```

### Structured Extraction

```typescript
const data = await ai.extract(
  'Extract user info from: John Doe, john@example.com, age 30',
  {
    name: { type: 'string' },
    email: { type: 'string' },
    age: { type: 'number' }
  }
)
```

### Batch Embeddings

```typescript
const embeddings = await ai.embedBatch([
  'First document',
  'Second document',
  'Third document'
])
```

## Environment Variables

```env
# OpenRouter
OPENROUTER_API_KEY=your-api-key

# Database for RAG
DATABASE_URL=postgresql://user:pass@localhost/dbname
```

## License

MIT