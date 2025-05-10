import React from 'react'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { 
  ChevronDown, 
  Code, 
  Copy, 
  AlertCircle, 
  Server, 
  Globe, 
  User, 
  Clock, 
  Tag
} from 'lucide-react'
import { DateTime } from 'luxon'

interface ErrorDetailsProps {
  error: {
    id: string
    type: string
    message: string
    level: string
    timestamp: string
    project_id: string
    environment: string
    handled?: boolean
    user?: any
    request?: any
    exception?: any
    breadcrumbs?: any[]
    contexts?: any
    tags?: Record<string, string>
    extra?: any
    received_at?: string
    first_seen?: string
  }
}

export function ErrorDetails({ error }: ErrorDetailsProps) {
  const formattedTime = DateTime.fromISO(error.timestamp).toFormat('LLL dd, yyyy HH:mm:ss')
  const firstSeen = error.first_seen ? DateTime.fromISO(error.first_seen).toFormat('LLL dd, yyyy HH:mm:ss') : null
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold">{error.type}</CardTitle>
              <CardDescription className="mt-1">
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
              {error.handled === false && (
                <Badge variant="destructive">Unhandled</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-md mb-4">
            <div className="flex justify-between">
              <p className="font-mono text-sm break-words">{error.message}</p>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => copyToClipboard(error.message)}
                className="h-8 w-8"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">First seen:</span>
              <span className="text-sm">{firstSeen || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm">{error.handled === false ? 'Unhandled' : 'Handled'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full">
        {error.exception && (
          <AccordionItem value="exception">
            <AccordionTrigger className="text-base font-medium">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Exception Details
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {typeof error.exception === 'string' 
                  ? error.exception 
                  : JSON.stringify(error.exception, null, 2)}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {error.request && (
          <AccordionItem value="request">
            <AccordionTrigger className="text-base font-medium">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Request Information
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {typeof error.request === 'string' 
                  ? error.request 
                  : JSON.stringify(error.request, null, 2)}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {error.user && (
          <AccordionItem value="user">
            <AccordionTrigger className="text-base font-medium">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                User Information
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {typeof error.user === 'string' 
                  ? error.user 
                  : JSON.stringify(error.user, null, 2)}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {error.contexts && (
          <AccordionItem value="contexts">
            <AccordionTrigger className="text-base font-medium">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Context Information
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {typeof error.contexts === 'string' 
                  ? error.contexts 
                  : JSON.stringify(error.contexts, null, 2)}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {error.tags && Object.keys(error.tags).length > 0 && (
          <AccordionItem value="tags">
            <AccordionTrigger className="text-base font-medium">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2 p-4">
                {Object.entries(error.tags).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {error.breadcrumbs && error.breadcrumbs.length > 0 && (
          <AccordionItem value="breadcrumbs">
            <AccordionTrigger className="text-base font-medium">
              <div className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Breadcrumbs
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {error.breadcrumbs.map((breadcrumb, index) => (
                  <div key={index} className="p-2 border rounded-md">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{breadcrumb.category || 'Event'}</span>
                      <Badge variant="outline" className="text-xs">
                        {breadcrumb.level || 'info'}
                      </Badge>
                    </div>
                    <p className="text-sm">{breadcrumb.message || JSON.stringify(breadcrumb.data)}</p>
                    {breadcrumb.timestamp && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {DateTime.fromISO(breadcrumb.timestamp).toFormat('HH:mm:ss')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  )
}
