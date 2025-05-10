import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { DateTime } from 'luxon'

interface ErrorCardProps {
  error: {
    id: string
    type: string
    message: string
    level: string
    timestamp: string
    project_id: string
    environment: string
  }
  onViewDetails?: (id: string) => void
}

export function ErrorCard({ error, onViewDetails }: ErrorCardProps) {
  const formattedTime = DateTime.fromISO(error.timestamp).toRelative()

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{error.type}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {formattedTime}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={error.level === 'error' ? 'destructive' : 
                     error.level === 'warning' ? 'warning' : 'default'}
            >
              {error.level}
            </Badge>
            <Badge variant="outline">{error.environment}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4 break-words">{error.message}</p>
        {onViewDetails && (
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewDetails(error.id)}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
