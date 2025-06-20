'use client'

import { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '#common/ui/components/app_layout'
import { Main } from '#common/ui/components/main'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Filter, AlertCircle, AlertTriangle, Info, Bug } from 'lucide-react'
import { DateTime } from 'luxon'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

// Import our reusable components
import { ErrorFilters } from '../../components/error_filters'
import ErrorEventDto from '#error/dtos/error_event_dto'
import ProjectDto from '#error/dtos/project_dto'

interface Filters {
  startDate: string | null
  endDate: string | null
  level: string | null
  environment: string | null
  search: string | null
}

interface Pagination {
  currentPage: number
  totalPages: number
  perPage: number
}

interface AllErrorsProps {
  events: ErrorEventDto[]
  projects: ProjectDto[]
  total: number
  errorCounts: Record<string, number>
  filters: Filters
  pagination: Pagination
}

export default function AllErrors({
  events,
  projects,
  total,
  errorCounts,
  filters: initialFilters,
  pagination,
}: AllErrorsProps) {
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '')
  const [level, setLevel] = useState(initialFilters.level || '')
  const [environment, setEnvironment] = useState(initialFilters.environment || '')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [page, setPage] = useState(pagination.currentPage)
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialFilters.startDate ? new Date(initialFilters.startDate) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialFilters.endDate ? new Date(initialFilters.endDate) : undefined
  )

  const applyFilters = () => {
    const queryParams = new URLSearchParams()

    if (searchTerm) queryParams.set('search', searchTerm)
    if (level) queryParams.set('level', level)
    if (environment) queryParams.set('environment', environment)
    if (selectedProject) queryParams.set('projectId', selectedProject)
    if (startDate) queryParams.set('startDate', startDate.toISOString())
    if (endDate) queryParams.set('endDate', endDate.toISOString())
    if (page > 1) queryParams.set('page', page.toString())

    window.location.href = `/errors?${queryParams.toString()}`
  }

  const resetFilters = () => {
    setSearchTerm('')
    setLevel('')
    setEnvironment('')
    setSelectedProject('')
    setStartDate(undefined)
    setEndDate(undefined)
    setPage(1)

    window.location.href = '/errors'
  }

  const goToPage = (newPage: number) => {
    const queryParams = new URLSearchParams(window.location.search)
    queryParams.set('page', newPage.toString())
    window.location.href = `/errors?${queryParams.toString()}`
  }

  const getLevelBadgeVariant = (level: string): 'default' | 'destructive' | 'outline' => {
    switch (level.toLowerCase()) {
      case 'error':
      case 'fatal':
        return 'destructive'
      case 'warning':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
      case 'fatal':
        return <AlertCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
      default:
        return <Bug className="h-4 w-4" />
    }
  }

  const getEnvironmentBadgeVariant = (env: string): 'default' | 'destructive' | 'outline' => {
    switch (env.toLowerCase()) {
      case 'production':
        return 'destructive'
      case 'staging':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getProjectById = (projectId: string) => {
    return projects.find(p => p.id === projectId)
  }

  // Get unique environments from events
  const uniqueEnvironments = Array.from(new Set(events.map(e => e.environment).filter(Boolean)))

  return (
    <AppLayout>
      <Head title="All Errors" />
      <Main>
        <div className="container mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">All Errors</h1>
              <p className="text-muted-foreground">Monitor error events across all your projects</p>
            </div>
          </div>

          {/* Error Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Across all projects</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {(errorCounts.error || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {(errorCounts.warning || 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
                <p className="text-xs text-muted-foreground">Reporting errors</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card>
            <CardHeader>
              <CardTitle>Error Events</CardTitle>
              <CardDescription>Filter and browse error events from all projects</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="space-y-4 mb-6">
                <ErrorFilters
                  filters={{
                    search: searchTerm,
                    level,
                    environment,
                    startDate,
                    endDate,
                  }}
                  onFilterChange={(name, value) => {
                    if (name === 'search') setSearchTerm(value)
                    else if (name === 'level') setLevel(value)
                    else if (name === 'environment') setEnvironment(value)
                    else if (name === 'dateRange') {
                      setStartDate(value.startDate)
                      setEndDate(value.endDate)
                    }
                  }}
                  onClearFilters={resetFilters}
                  environments={uniqueEnvironments.length > 0 ? uniqueEnvironments : ['production', 'staging', 'development']}
                />

                {/* Project Filter */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Project:</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                  <Button onClick={applyFilters}>
                    <Filter className="mr-2 h-4 w-4" />
                    Apply Filters
                  </Button>
                </div>
              </div>

              {/* Error Events Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No error events found. Adjust your filters or check back later.
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((event) => {
                        const project = getProjectById(event.projectId)
                        return (
                          <TableRow key={event.id}>
                            <TableCell>
                              <Badge variant={getLevelBadgeVariant(event.level)} className="flex items-center gap-1 w-fit">
                                {getLevelIcon(event.level)}
                                {event.level}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {project ? (
                                <Link
                                  href={`/projects/${project.id}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                >
                                  {project.name}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">Unknown</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium max-w-md">
                              <div className="truncate" title={event.message}>
                                {event.message || 'No message'}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{event.type || 'Unknown'}</TableCell>
                            <TableCell>
                              {event.environment && (
                                <Badge variant={getEnvironmentBadgeVariant(event.environment)}>
                                  {event.environment}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                                <span
                                  title={DateTime.fromISO(event.timestamp.toString()).toFormat(
                                    'LLL dd, yyyy HH:mm:ss'
                                  )}
                                >
                                  {DateTime.fromISO(event.timestamp.toString()).toRelative()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${event.projectId}/errors/${event.id}`}>
                                  <ExternalLink className="h-4 w-4" />
                                  <span className="sr-only">View details</span>
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {events.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {events.length} of {total} errors
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {pagination.totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </AppLayout>
  )
}