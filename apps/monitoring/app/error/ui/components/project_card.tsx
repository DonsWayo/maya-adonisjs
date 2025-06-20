import React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Edit, ExternalLink } from 'lucide-react'
import { DateTime } from 'luxon'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description?: string
    environment: string
    created_at: string
    error_count?: number
  }
  onView?: (id: string) => void
  onEdit?: (id: string) => void
}

export function ProjectCard({ project, onView, onEdit }: ProjectCardProps) {
  const formattedDate = DateTime.fromISO(project.created_at).toFormat('LLL dd, yyyy')

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Created on {formattedDate}
            </CardDescription>
          </div>
          <Badge variant="outline">{project.environment}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {project.description && <p className="text-sm mb-4">{project.description}</p>}

        {project.error_count !== undefined && (
          <div className="mb-4">
            <Badge variant={project.error_count > 0 ? 'destructive' : 'success'}>
              {project.error_count} {project.error_count === 1 ? 'error' : 'errors'}
            </Badge>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(project.id)}
              className="flex items-center gap-1"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}

          {onView && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onView(project.id)}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
