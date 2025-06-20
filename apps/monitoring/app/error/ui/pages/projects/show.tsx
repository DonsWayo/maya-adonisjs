'use client'

import { Head } from '@inertiajs/react'
import AppLayout from '#common/ui/components/app_layout'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { Edit, Trash2, AlertCircle, BarChart2, Code, Copy, ExternalLink } from 'lucide-react'
import { DateTime } from 'luxon'
import ProjectDto from '#error/dtos/project_dto'
import { getPlatformBadgeColor, getStatusBadgeColor } from '#error/ui/components/error_types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { useState } from 'react'

// Using ProjectDto from DTOs instead of inline interface

interface Stats {
  totalErrors: number
  todayErrors: number
  resolvedErrors: number
}

interface ProjectShowProps {
  project: ProjectDto
  stats: Stats
}

export default function ProjectShow({ project, stats }: ProjectShowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyDsn = () => {
    navigator.clipboard.writeText(project.dsn)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Using getPlatformBadgeColor from error_types.tsx

  // Using getStatusBadgeColor from error_types.tsx

  return (
    <AppLayout>
      <Head title={`${project.name} | Project Details`} />

      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              {project.name}
              <Badge className={`ml-3 ${getStatusBadgeColor(project.status)}`}>
                {project.status}
              </Badge>
              <Badge className={`ml-2 ${getPlatformBadgeColor(project.platform)}`}>
                {project.platform}
              </Badge>
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <a href={`/projects/${project.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </a>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <CardDescription>All time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalErrors.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today's Errors</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayErrors.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CardDescription>All time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolvedErrors.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Events</CardTitle>
                <CardDescription>View and manage error events for this project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p>View detailed error events and analytics for this project.</p>
                  <Button asChild>
                    <a href={`/projects/${project.id}/errors`}>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      View Errors
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Error trends and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <p>View analytics and trends for errors in this project.</p>
                  <Button variant="outline" asChild>
                    <a href={`/projects/${project.id}/analytics`}>
                      <BarChart2 className="mr-2 h-4 w-4" />
                      View Analytics
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Project Settings</CardTitle>
                <CardDescription>Basic information about this project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Project ID</h3>
                    <p>{project.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Slug</h3>
                    <p>{project.slug}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                    <p>
                      {typeof project.createdAt === 'string'
                        ? DateTime.fromISO(project.createdAt).toRelative()
                        : DateTime.fromJSDate(project.createdAt as Date).toRelative()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                    <p>
                      {typeof project.updatedAt === 'string'
                        ? DateTime.fromISO(project.updatedAt).toRelative()
                        : DateTime.fromJSDate(project.updatedAt as Date).toRelative()}
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <Button asChild>
                    <a href={`/projects/${project.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Project
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keys">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Authentication keys for this project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">DSN (Data Source Name)</h3>
                  <div className="flex items-center">
                    <code className="bg-muted p-2 rounded flex-1 overflow-x-auto">
                      {project.dsn}
                    </code>
                    <Button variant="ghost" size="sm" onClick={copyDsn} className="ml-2">
                      {copied ? (
                        <span className="text-green-500 flex items-center">Copied!</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use this DSN to configure your SDK client.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Public Key</h3>
                  <code className="bg-muted p-2 rounded block overflow-x-auto">
                    {project.publicKey}
                  </code>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Secret Key</h3>
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground">
                      <span className="font-mono">••••••••••••••••••••••••••••••••</span>
                      <Button variant="ghost" size="sm" className="ml-2">
                        <ExternalLink className="h-4 w-4" />
                        <span className="ml-1">Reveal</span>
                      </Button>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Keep this key secret. It provides full access to this project.
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-2">SDK Setup</h3>
                  <div className="bg-muted p-4 rounded">
                    <h4 className="text-sm font-medium mb-2">JavaScript</h4>
                    <pre className="text-xs overflow-x-auto">
                      {`import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "${project.dsn}",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the project "{project.name}" and all its associated
                error data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <a
                  href={`/projects/${project.id}`}
                  method="delete"
                  as="button"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </a>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  )
}
