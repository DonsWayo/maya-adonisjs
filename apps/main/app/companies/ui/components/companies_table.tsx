import React from 'react'
import {
  DataTable,
  DataTableToolbar,
  ColumnDef,
  DataTableFacetedFilter,
} from '@workspace/ui/components/data-table'
import { Input } from '@workspace/ui/components/input'
import { Building2, Globe, Mail, Phone, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import CompanyDto from '#companies/dtos/company'
import UserDto from '#users/dtos/user'

import { DataTableRowActions } from '#companies/ui/components/companies_row_actions'

interface DataTableProps {
  companies: CompanyDto[]
  users: UserDto[]
}

export function CompaniesTable({ companies, users }: DataTableProps) {
  const columns: ColumnDef<CompanyDto>[] = [
    {
      header: 'Company',
      accessorKey: 'name',
      cell: ({ row }) => {
        const company = row.original
        return (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0">
              {company.logoUrl ? (
                <img className="h-10 w-10 rounded-full object-cover" src={company.logoUrl} alt="" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Building2 className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
            <div className="ml-4">
              <a href={`/companies/${company.id}`} className="font-medium text-gray-900 hover:underline">
                {company.name}
              </a>
              {company.website && (
                <div className="flex items-center text-gray-500">
                  <Globe className="mr-1 h-3 w-3" />
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    // Owner column removed - now managed through user_companies relationship
    {
      id: 'actions',
      cell: DataTableRowActions,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={companies}
      Toolbar={(props) => (
        <DataTableToolbar
          {...props}
          additionalFilters={
            <>
              <Input
                placeholder={'Search companies...'}
                value={(props.table.getColumn('name')?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  props.table.getColumn('name')?.setFilterValue(event.target.value)
                }
                className="h-8 w-[150px] lg:w-[250px]"
              />
              {/* Owner filter removed - now managed through user_companies relationship */}
            </>
          }
        />
      )}
    />
  )
}
