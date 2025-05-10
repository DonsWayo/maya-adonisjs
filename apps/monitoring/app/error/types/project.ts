/**
 * Project types and interfaces
 */

// Base project interface
export interface Project {
  id: string
  name: string
  slug: string
  platform: string
  dsn: string
  publicKey: string
  secretKey: string
  status: string
  organizationId?: string
  teamId?: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

// Project statistics
export interface ProjectStats {
  totalErrors: number
  todayErrors: number
  resolvedErrors: number
  byLevel?: {
    error: number
    warning: number
    info: number
    critical: number
  }
  byEnvironment?: Record<string, number>
}

// Project filter options
export interface ProjectFilters {
  search?: string
  platform?: string
  status?: string
}
