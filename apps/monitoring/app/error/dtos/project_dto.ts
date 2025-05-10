/**
 * DTO for projects
 */
export default interface ProjectDto {
  // Core project data
  id: string
  name: string
  slug: string
  platform: string
  
  // Authentication details
  dsn: string
  publicKey: string
  secretKey?: string // Secret key is optional in responses
  
  // Status and organization
  status: string
  organizationId?: string
  teamId?: string
  
  // Additional information
  description?: string
  
  // Timestamps
  createdAt: string | Date
  updatedAt: string | Date
}
