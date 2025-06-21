'use client'

import { useState } from 'react'
import { Head } from '@inertiajs/react'
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
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Filter } from 'lucide-react'
import { DateTime } from 'luxon'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

// Import our reusable components
import { ErrorFilters } from '../../components/error_filters'
import { ErrorCard } from '../../components/error_card'

interface Project {
  id: string
  name: string
  platform: string
}

interface ErrorEvent {
  id: string
  timestamp: string
  level: string
  message: string
  type: string
  environment: string
  transaction: string | null
  release: string | null
}

interface EventCount {
  time_bucket: string
  count: number
}

interface ErrorType {
  type: string
  count: number
}

interface Filters {
  startDate: string | null
  endDate: string | null
  level: string | null
  environment: string | null
  search: string | null
}

interface Pagination {
  page: number
  limit: number
  offset: number
}

interface ErrorEventsIndexProps {
  project: Project
  events: ErrorEvent[]
  eventCounts: EventCount[]
  topErrorTypes: ErrorType[]
  filters: Filters
  pagination: Pagination
}

export default function ErrorEventsIndex({
  project,
  events,
  eventCounts,
  topErrorTypes,
  filters: initialFilters,
  pagination: initialPagination,
}: ErrorEventsIndexProps) {
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '')
  const [level, setLevel] = useState(initialFilters.level || 'all')
  const [environment, setEnvironment] = useState(initialFilters.environment || 'all')
  const [page, setPage] = useState(initialPagination.page)
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialFilters.startDate ? new Date(initialFilters.startDate) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialFilters.endDate ? new Date(initialFilters.endDate) : undefined
  )

  const applyFilters = () => {
    const queryParams = new URLSearchParams()

    if (searchTerm) queryParams.set('search', searchTerm)
    if (level && level !== 'all') queryParams.set('level', level)
    if (environment && environment !== 'all') queryParams.set('environment', environment)
    if (startDate) queryParams.set('startDate', startDate.toISOString())
    if (endDate) queryParams.set('endDate', endDate.toISOString())
    if (page > 1) queryParams.set('page', page.toString())

    window.location.href = `/projects/${project.id}/errors?${queryParams.toString()}`
  }

  const resetFilters = () => {
    setSearchTerm('')
    setLevel('all')
    setEnvironment('all')
    setStartDate(undefined)
    setEndDate(undefined)
    setPage(1)

    window.location.href = `/projects/${project.id}/errors`
  }

  const goToPage = (newPage: number) => {
    const queryParams = new URLSearchParams(window.location.search)
    queryParams.set('page', newPage.toString())
    window.location.href = `/projects/${project.id}/errors?${queryParams.toString()}`
  }

  const getLevelBadgeVariant = (level: string): 'default' | 'destructive' | 'outline' => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'destructive'
      case 'warning':
        return 'default'
      default:
        return 'outline'
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

  return (
    <AppLayout>
      <Head title={`Errors - ${project.name}`} />
      <Main>
        <div className="container mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{project.name} Errors</h1>
              <p className="text-muted-foreground">View and filter error events for this project</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
                <CardDescription>Latest error events for this project</CardDescription>
              </CardHeader>
              <CardContent>
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
                  environments={['production', 'staging', 'development']}
                />

                <div className="flex justify-end space-x-2 mb-4">
                  <Button onClick={applyFilters}>
                    <Filter className="mr-2 h-4 w-4" />
                    Apply Filters
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
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
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No error events found. Adjust your filters or check back later.
                          </TableCell>
                        </TableRow>
                      ) : (
                        events.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <Badge variant={getLevelBadgeVariant(event.level)}>
                                {event.level}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium max-w-md truncate">
                              {event.message}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{event.type}</TableCell>
                            <TableCell>
                              <Badge variant={getEnvironmentBadgeVariant(event.environment)}>
                                {event.environment}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                                <span
                                  title={DateTime.fromISO(event.timestamp).toFormat(
                                    'LLL dd, yyyy HH:mm:ss'
                                  )}
                                >
                                  {DateTime.fromISO(event.timestamp).toRelative()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/projects/${project.id}/errors/${event.id}`}>
                                  <ExternalLink className="h-4 w-4" />
                                  <span className="sr-only">View details</span>
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {events.length > 0 && (
                  <div className="flex items-center justify-end space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous page</span>
                    </Button>
                    <div className="text-sm text-muted-foreground">Page {page}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(page + 1)}
                      disabled={events.length < initialPagination.limit}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next page</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Error Levels</CardTitle>
                  <CardDescription>Distribution</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2 flex-wrap">
                  {Array.from(new Set(events.map((e) => e.level))).map((level) => (
                    <Badge key={level} variant={getLevelBadgeVariant(level)}>
                      {level}
                    </Badge>
                  ))}
                  {events.length === 0 && (
                    <div className="text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Environments</CardTitle>
                  <CardDescription>Distribution</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2 flex-wrap">
                  {Array.from(new Set(events.map((e) => e.environment))).map((env) => (
                    <Badge key={env} variant={getEnvironmentBadgeVariant(env)}>
                      {env}
                    </Badge>
                  ))}
                  {events.length === 0 && (
                    <div className="text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Main>
    </AppLayout>
  )
}
