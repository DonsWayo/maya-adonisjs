'use client'

import { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '#common/ui/components/app_layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Input } from '@workspace/ui/components/input'
import { MoreHorizontal, Search, Plus, Edit, Trash2, ExternalLink } from 'lucide-react'
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

interface ProjectsIndexProps {
  projects: ProjectDto[]
}

export default function ProjectsIndex({ projects }: ProjectsIndexProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<ProjectDto | null>(null)

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.platform.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = (project: ProjectDto) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  // Using getPlatformBadgeColor from error_types.tsx

  // Using getStatusBadgeColor from error_types.tsx

  return (
    <AppLayout>
      <Head title="Projects" />

      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage your monitoring projects and view error data
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm
                        ? 'No projects found matching your search.'
                        : 'No projects found. Create your first project!'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-left font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {project.name}
                          </Link>
                          <span className="text-sm text-muted-foreground">{project.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getPlatformBadgeColor(project.platform)}`}>
                          {project.platform}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(project.status)}`}>
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {typeof project.createdAt === 'string'
                          ? DateTime.fromISO(project.createdAt).toRelative()
                          : DateTime.fromJSDate(project.createdAt as Date).toRelative()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/projects/${project.id}`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/projects/${project.id}/errors`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Errors
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/projects/${project.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(project)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the project "{projectToDelete?.name}" and all its
                associated error data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <a
                  href={`/projects/${projectToDelete?.id}`}
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
