import React from 'react'
import { InferPageProps } from '@adonisjs/inertia/types'

import type CompaniesController from '#companies/controllers/companies_controller'

import AppLayout from '#common/ui/components/app_layout'
import HeadingSmall from '#common/ui/components/heading_small'
import { Main } from '#common/ui/components/main'
import { CompanyForm } from '#companies/ui/components/company_form'

interface CreateProps {
  users: UserDto[]
  intendedUrl?: string
}

import type UserDto from '#users/dtos/user'

export default function Create({ users, intendedUrl }: CreateProps) {
  return (
    <AppLayout breadcrumbs={[{ label: 'Companies' }, { label: 'Create' }]}>
      <Main>
        <div className="space-y-6">
          <HeadingSmall
            title="Create New Company"
            description="Fill in the details below to create a new company."
          />
          
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <CompanyForm users={users} />
            </div>
          </div>
        </div>
      </Main>
    </AppLayout>
  )
}
