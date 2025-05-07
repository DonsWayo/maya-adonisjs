import React from 'react'
// Removed Link import to avoid TypeScript errors
// Removed Lucide icon import to avoid TypeScript errors

import AppLayout from '#common/ui/components/app_layout'
import { CompanyForm } from '#companies/ui/components/company_form'

import type UserDto from '#users/dtos/user'

interface CreateProps {
  users: UserDto[]
}

export default function Create({ users }: CreateProps) {
  return (
    <AppLayout breadcrumbs={[{ label: 'Companies' }, { label: 'Create' }]}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center">
          <a href="/companies" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <span className="mr-1">←</span>
            Back to Companies
          </a>
        </div>

        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Create New Company</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Fill in the details below to create a new company.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <CompanyForm users={users} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
