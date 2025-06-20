import { AlertCircle, AlertTriangle, Ban, Info } from 'lucide-react'

// Error levels with associated icons and colors
export const errorLevels = [
  {
    id: 'error',
    icon: AlertCircle,
    color: 'bg-red-500',
  },
  {
    id: 'warning',
    icon: AlertTriangle,
    color: 'bg-yellow-500',
  },
  {
    id: 'info',
    icon: Info,
    color: 'bg-blue-500',
  },
  {
    id: 'critical',
    icon: Ban,
    color: 'bg-purple-500',
  },
] as const

// Environment types - these should be loaded dynamically from the backend
// This is just a default set that can be extended by the application
export const environmentTypes: string[] = []

// Project platform types with associated colors
export const platformTypes = [
  {
    id: 'javascript',
    color: 'bg-yellow-500',
  },
  {
    id: 'python',
    color: 'bg-blue-500',
  },
  {
    id: 'node',
    color: 'bg-green-500',
  },
  {
    id: 'go',
    color: 'bg-cyan-500',
  },
  {
    id: 'react-native',
    color: 'bg-purple-500',
  },
] as const

// Project status types with associated colors
export const statusTypes = [
  {
    id: 'active',
    color: 'bg-green-500',
  },
  {
    id: 'inactive',
    color: 'bg-gray-500',
  },
  {
    id: 'disabled',
    color: 'bg-red-500',
  },
] as const

// Helper functions for UI components
export const getPlatformBadgeColor = (platform: string): string => {
  const platformType = platformTypes.find((p) => p.id === platform.toLowerCase())
  return platformType?.color || 'bg-gray-500'
}

export const getStatusBadgeColor = (status: string): string => {
  const statusType = statusTypes.find((s) => s.id === status.toLowerCase())
  return statusType?.color || 'bg-gray-500'
}

export const getErrorLevelBadgeColor = (level: string): string => {
  const errorLevel = errorLevels.find((l) => l.id === level.toLowerCase())
  return errorLevel?.color || 'bg-gray-500'
}

export const getErrorLevelIcon = (level: string) => {
  const errorLevel = errorLevels.find((l) => l.id === level.toLowerCase())
  return errorLevel?.icon || AlertCircle
}
