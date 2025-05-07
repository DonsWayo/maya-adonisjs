import React from 'react'
import { EditIcon, TrashIcon, EllipsisIcon, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { DataTableRowActionsProps } from '@workspace/ui/components/data-table/data-table'

import { useCompanies } from '#companies/ui/context/companies_context'
import { Link } from '@inertiajs/react'

import type CompanyDto from '#companies/dtos/company'

export function DataTableRowActions({ row }: DataTableRowActionsProps<CompanyDto>) {
  const { setOpen, setCurrentRow } = useCompanies()

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <EllipsisIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <Link href={`/companies/${row.original.id}`} className="w-full">
            <DropdownMenuItem>
              View
              <DropdownMenuShortcut>
                <Eye size={16} />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('edit')
            }}
          >
            Edit
            <DropdownMenuShortcut>
              <EditIcon size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(row.original)
              setOpen('delete')
            }}
            className="!text-red-500"
          >
            Delete
            <DropdownMenuShortcut>
              <TrashIcon size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
