'use client'

import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import { DateTime } from 'luxon'
import AppLayout from '#common/ui/components/app_layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock,
  Server,
  Globe,
  Tag,
  User,
  Code,
  Layers,
  Copy,
  ExternalLink,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'

interface Project {
  id: string
  name: string
  platform: string
}

interface ErrorEvent {
  id: string
  timestamp: string
  projectId: string
  level: string
  message: string
  type: string
  platform: string
  sdk: string
  release: string | null
  environment: string
  serverName: string | null
  transaction: string | null
  user: Record<string, any> | null
  request: Record<string, any> | null
  tags: Record<string, string> | null
  extra: Record<string, any> | null
  exception: {
    values: Array<{
      type: string
      value: string
      module?: string
      stacktrace?: {
        frames: Array<{
          filename: string
          function?: string
          module?: string
          lineno?: number
          colno?: number
          in_app?: boolean
          context_line?: string
          [key: string]: any
        }>
      }
      [key: string]: any
    }>
  } | null
  breadcrumbs: Array<{
    timestamp: string | number
    type: string
    category?: string
    level?: string
    message?: string
    data?: Record<string, any>
  }> | null
  contexts: Record<string, any> | null
  fingerprint: string[] | null
}

interface ErrorEventShowProps {
  project: Project
  event: ErrorEvent
}

export default function ErrorEventShow({ project, event }: ErrorEventShowProps) {
  const [copied, setCopied] = useState(false)

  const copyEventId = () => {
    navigator.clipboard.writeText(event.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'info':
        return 'bg-blue-500'
      case 'debug':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getEnvironmentBadgeColor = (env: string) => {
    switch (env.toLowerCase()) {
      case 'production':
        return 'bg-green-500'
      case 'staging':
        return 'bg-orange-500'
      case 'development':
        return 'bg-blue-500'
      case 'test':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Parse SDK from JSON string
  const sdkInfo = (() => {
    try {
      return JSON.parse(event.sdk)
    } catch (e) {
      return { name: 'unknown', version: 'unknown' }
    }
  })()

  // Format the exception stack trace for display
  const formatStackTrace = () => {
    if (!event.exception?.values?.[0]?.stacktrace?.frames) {
      return null
    }

    const frames = [...event.exception.values[0].stacktrace.frames].reverse()

    return (
      <div className="font-mono text-xs overflow-x-auto">
        {frames.map((frame, index) => (
          <div
            key={index}
            className={`py-1 ${frame.in_app ? 'text-red-600' : 'text-muted-foreground'}`}
          >
            <div className="flex items-start">
              <div className="w-8 text-right mr-2 text-muted-foreground">{index + 1}.</div>
              <div>
                <div>
                  {frame.function && <span className="font-semibold">{frame.function}</span>}
                  {frame.function && ' in '}
                  <span>{frame.filename}</span>
                  {(frame.lineno || frame.colno) && (
                    <span>
                      {' at '}
                      {frame.lineno && `line ${frame.lineno}`}
                      {frame.lineno && frame.colno && ', '}
                      {frame.colno && `column ${frame.colno}`}
                    </span>
                  )}
                </div>
                {frame.context_line && (
                  <div className="pl-4 border-l-2 border-red-300 mt-1">
                    <pre>{frame.context_line}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <AppLayout>
      <Head title={`Error Details | ${project.name}`} />

      <div className="container mx-auto py-6">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${project.id}`}>{project.name}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/projects/${project.id}/errors`}>Errors</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>Error Details</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getLevelBadgeColor(event.level)}>{event.level}</Badge>
              <Badge className={getEnvironmentBadgeColor(event.environment)}>
                {event.environment}
              </Badge>
              {event.release && <Badge variant="outline">Release: {event.release}</Badge>}
            </div>
            <h1 className="text-2xl font-bold mb-1">{event.message}</h1>
            <div className="text-muted-foreground flex items-center gap-4">
              <div className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                <span title={new Date(event.timestamp).toLocaleString()}>
                  {DateTime.fromISO(event.timestamp).toRelative()}
                </span>
              </div>
              <div className="flex items-center">
                <Code className="mr-1 h-4 w-4" />
                <span>{event.type}</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <a href={`/projects/${project.id}/errors`}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Errors
              </a>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm text-muted-foreground">Event ID:</div>
          <code className="bg-muted px-2 py-1 rounded text-sm">{event.id}</code>
          <Button variant="ghost" size="sm" onClick={copyEventId} className="h-6">
            {copied ? (
              <span className="text-green-500 text-xs">Copied!</span>
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>

        <Tabs defaultValue="exception" className="mb-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="exception">Exception</TabsTrigger>
            <TabsTrigger value="breadcrumbs">Breadcrumbs</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="user">User</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
          </TabsList>

          <TabsContent value="exception" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Exception Details</CardTitle>
                <CardDescription>Stack trace and error information</CardDescription>
              </CardHeader>
              <CardContent>
                {event.exception ? (
                  <div className="space-y-4">
                    {event.exception.values?.map((exception, index) => (
                      <div key={index} className="space-y-2">
                        <div className="font-semibold text-lg">
                          {exception.type}: {exception.value}
                        </div>
                        {exception.module && (
                          <div className="text-sm text-muted-foreground">
                            Module: {exception.module}
                          </div>
                        )}
                        {exception.stacktrace && (
                          <div className="mt-4 border rounded-md p-4 bg-muted/50">
                            <div className="text-sm font-medium mb-2">Stack Trace</div>
                            {formatStackTrace()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No exception details available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breadcrumbs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Breadcrumbs</CardTitle>
                <CardDescription>Event history leading up to the error</CardDescription>
              </CardHeader>
              <CardContent>
                {event.breadcrumbs && event.breadcrumbs.length > 0 ? (
                  <div className="space-y-2">
                    {event.breadcrumbs.map((breadcrumb, index) => (
                      <div
                        key={index}
                        className="flex items-start border-l-2 border-gray-300 pl-4 pb-4"
                      >
                        <div className="mr-4 min-w-[120px]">
                          <div className="text-xs text-muted-foreground">
                            {new Date(
                              typeof breadcrumb.timestamp === 'string'
                                ? breadcrumb.timestamp
                                : Number(breadcrumb.timestamp)
                            ).toLocaleTimeString()}
                          </div>
                          {breadcrumb.level && (
                            <Badge
                              className={`mt-1 ${getLevelBadgeColor(breadcrumb.level)}`}
                              variant="secondary"
                            >
                              {breadcrumb.level}
                            </Badge>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {breadcrumb.category || breadcrumb.type}
                          </div>
                          {breadcrumb.message && (
                            <div className="text-sm">{breadcrumb.message}</div>
                          )}
                          {breadcrumb.data && Object.keys(breadcrumb.data).length > 0 && (
                            <div className="mt-1 text-xs bg-muted p-2 rounded">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(breadcrumb.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No breadcrumbs available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="request" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Information</CardTitle>
                <CardDescription>HTTP request details at the time of the error</CardDescription>
              </CardHeader>
              <CardContent>
                {event.request && Object.keys(event.request).length > 0 ? (
                  <div className="space-y-4">
                    {event.request.url && (
                      <div>
                        <div className="text-sm font-medium mb-1">URL</div>
                        <div className="break-all bg-muted p-2 rounded">{event.request.url}</div>
                      </div>
                    )}

                    {event.request.method && (
                      <div>
                        <div className="text-sm font-medium mb-1">Method</div>
                        <Badge variant="outline">{event.request.method}</Badge>
                      </div>
                    )}

                    {event.request.headers && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="headers">
                          <AccordionTrigger className="text-sm font-medium">
                            Headers
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="bg-muted p-2 rounded text-xs">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(event.request.headers, null, 2)}
                              </pre>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}

                    {event.request.data && (
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="data">
                          <AccordionTrigger className="text-sm font-medium">
                            Request Data
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="bg-muted p-2 rounded text-xs">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(event.request.data, null, 2)}
                              </pre>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No request information available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
                <CardDescription>Details about the user at the time of the error</CardDescription>
              </CardHeader>
              <CardContent>
                {event.user && Object.keys(event.user).length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {event.user.id && (
                        <div>
                          <div className="text-sm font-medium mb-1">User ID</div>
                          <div className="break-all">{event.user.id}</div>
                        </div>
                      )}

                      {event.user.username && (
                        <div>
                          <div className="text-sm font-medium mb-1">Username</div>
                          <div>{event.user.username}</div>
                        </div>
                      )}

                      {event.user.email && (
                        <div>
                          <div className="text-sm font-medium mb-1">Email</div>
                          <div>{event.user.email}</div>
                        </div>
                      )}

                      {event.user.ip_address && (
                        <div>
                          <div className="text-sm font-medium mb-1">IP Address</div>
                          <div>{event.user.ip_address}</div>
                        </div>
                      )}
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="user-data">
                        <AccordionTrigger className="text-sm font-medium">
                          All User Data
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="bg-muted p-2 rounded text-xs">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(event.user, null, 2)}
                            </pre>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No user information available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="context" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Additional Context</CardTitle>
                <CardDescription>
                  Environment, tags, and other contextual information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Platform</div>
                        <div>{event.platform}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">SDK</div>
                        <div>
                          {sdkInfo.name} {sdkInfo.version}
                        </div>
                      </div>
                      {event.serverName && (
                        <div>
                          <div className="text-sm text-muted-foreground">Server Name</div>
                          <div>{event.serverName}</div>
                        </div>
                      )}
                      {event.transaction && (
                        <div>
                          <div className="text-sm text-muted-foreground">Transaction</div>
                          <div>{event.transaction}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {event.tags && Object.keys(event.tags).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(event.tags).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="flex items-center gap-1">
                            <span className="font-semibold">{key}:</span> {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {event.contexts && Object.keys(event.contexts).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Contexts</h3>
                      <Accordion type="multiple" className="w-full">
                        {Object.entries(event.contexts).map(([key, value]) => (
                          <AccordionItem key={key} value={key}>
                            <AccordionTrigger className="text-sm">
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="bg-muted p-2 rounded text-xs">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}

                  {event.extra && Object.keys(event.extra).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Extra Data</h3>
                      <div className="bg-muted p-2 rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(event.extra, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {event.fingerprint && event.fingerprint.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Fingerprint</h3>
                      <div className="bg-muted p-2 rounded text-xs font-mono">
                        {event.fingerprint.join('\n')}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
