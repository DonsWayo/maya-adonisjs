import vine from '@vinejs/vine'
import { jsonrepair } from 'jsonrepair'
import type { 
  AIService, 
  ErrorAnalysis, 
  TicketAnalysis, 
  IssueAnalysis, 
  IncidentAnalysis 
} from '../types/index.js'

/**
 * Analyze an error and provide insights
 */
export async function analyzeError(
  ai: AIService,
  error: {
    message: string
    type: string
    stackTrace?: string
    context?: Record<string, any>
  }
): Promise<ErrorAnalysis> {
  const prompt = `
Analyze this error and provide a detailed analysis:

Error Type: ${error.type}
Error Message: ${error.message}
${error.stackTrace ? `Stack Trace:\n${error.stackTrace}` : ''}
${error.context ? `Context: ${JSON.stringify(error.context, null, 2)}` : ''}

Provide your analysis in the following JSON format:
{
  "summary": "Brief summary of the error",
  "severity": "critical|high|medium|low",
  "category": "runtime|configuration|dependency|network|database|other",
  "possibleCauses": ["cause1", "cause2", "cause3"],
  "suggestedFixes": [
    {
      "description": "Fix description",
      "code": "Optional code example",
      "confidence": 0.9
    }
  ],
  "relatedErrors": ["error_id1", "error_id2"]
}
`

  // Use generateText with JSON mode for now
  const response = await ai.generate(prompt, {
    temperature: 0.7,
    maxTokens: 1000,
  })

  try {
    // Remove markdown code blocks if present
    let cleanResponse = response
    if (response.includes('```json')) {
      cleanResponse = response.replace(/```json\s*/g, '').replace(/```/g, '')
    } else if (response.includes('```')) {
      cleanResponse = response.replace(/```\s*/g, '')
    }
    
    // Extract JSON from the response
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    // Use jsonrepair to fix common JSON issues
    const repairedJson = jsonrepair(jsonMatch[0])
    const analysis = JSON.parse(repairedJson) as ErrorAnalysis
    return analysis
  } catch (error) {
    console.error('Failed to parse AI response:', response)
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Analyze a support ticket
 */
export async function analyzeTicket(
  ai: AIService,
  ticket: {
    title: string
    description: string
    customerInfo?: Record<string, any>
    previousTickets?: string[]
  }
): Promise<TicketAnalysis> {
  const prompt = `
Analyze this support ticket:

Title: ${ticket.title}
Description: ${ticket.description}
${ticket.customerInfo ? `Customer Info: ${JSON.stringify(ticket.customerInfo)}` : ''}
${ticket.previousTickets?.length ? `Previous Tickets: ${ticket.previousTickets.join(', ')}` : ''}

Provide analysis in JSON format with:
- priority (urgent/high/normal/low)
- category (technical/billing/feature-request/bug/other)
- suggestedAssignee (if determinable)
- estimatedTime (e.g., "2 hours", "1 day")
- similarTickets (array of ticket IDs)
- suggestedResponse (draft response to customer)
`

  return ai.extract<TicketAnalysis>(prompt, {
    priority: { type: 'string', enum: ['urgent', 'high', 'normal', 'low'] },
    category: { type: 'string' },
    suggestedAssignee: { type: 'string', optional: true },
    estimatedTime: { type: 'string', optional: true },
    similarTickets: { type: 'array', items: { type: 'string' }, optional: true },
    suggestedResponse: { type: 'string', optional: true }
  })
}

/**
 * Analyze a project management issue
 */
export async function analyzeIssue(
  ai: AIService,
  issue: {
    title: string
    description: string
    codeContext?: string
  }
): Promise<IssueAnalysis> {
  const prompt = `
Analyze this project issue:

Title: ${issue.title}
Description: ${issue.description}
${issue.codeContext ? `Code Context:\n${issue.codeContext}` : ''}

Determine:
- type (bug/feature/task/improvement)
- complexity (trivial/minor/major/critical)
- suggestedLabels (relevant tags)
- dependencies (other issues that might be related)
- acceptanceCriteria (if applicable)
`

  return ai.extract<IssueAnalysis>(prompt, {
    type: { type: 'string', enum: ['bug', 'feature', 'task', 'improvement'] },
    complexity: { type: 'string', enum: ['trivial', 'minor', 'major', 'critical'] },
    suggestedLabels: { type: 'array', items: { type: 'string' } },
    dependencies: { type: 'array', items: { type: 'string' }, optional: true },
    acceptanceCriteria: { type: 'array', items: { type: 'string' }, optional: true }
  })
}

/**
 * Analyze an incident for status page
 */
export async function analyzeIncident(
  ai: AIService,
  incident: {
    description: string
    affectedSystems: string[]
    metrics?: Record<string, any>
  }
): Promise<IncidentAnalysis> {
  const prompt = `
Analyze this incident:

Description: ${incident.description}
Affected Systems: ${incident.affectedSystems.join(', ')}
${incident.metrics ? `Metrics: ${JSON.stringify(incident.metrics)}` : ''}

Provide:
- impact (none/minor/major/critical)
- affectedServices (list of services)
- rootCause (if determinable)
- statusMessage (public-facing message)
- estimatedResolution (e.g., "30 minutes", "2 hours")
`

  return ai.extract<IncidentAnalysis>(prompt, {
    impact: { type: 'string', enum: ['none', 'minor', 'major', 'critical'] },
    affectedServices: { type: 'array', items: { type: 'string' } },
    rootCause: { type: 'string', optional: true },
    statusMessage: { type: 'string' },
    estimatedResolution: { type: 'string', optional: true }
  })
}