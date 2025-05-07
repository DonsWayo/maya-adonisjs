import React from 'react'
import { InferPageProps } from '@adonisjs/inertia/types'

import type CompaniesController from '#companies/controllers/companies_controller'

import AppLayout from '#common/ui/components/app_layout'
import { Main } from '#common/ui/components/main'
import Heading from '#common/ui/components/heading'

import { CompaniesTable } from '#companies/ui/components/companies_table'
import { CompaniesPrimaryButtons } from '#companies/ui/components/companies_primary_buttons'
import { CompaniesDialogs } from '#companies/ui/components/companies_dialogs'
import { CompaniesProvider } from '#companies/ui/context/companies_context'

export default function ListCompaniesPage({ companies, users }: InferPageProps<CompaniesController, 'index'>) {
  return (
    <AppLayout breadcrumbs={[{ label: 'Companies' }]}>
      <CompaniesProvider>
        <Main>
          <Heading title="Companies" description="Manage your companies and their information here.">
            <CompaniesPrimaryButtons />
          </Heading>
          <div className="-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0">
            <CompaniesTable companies={companies} users={users} />
          </div>
        </Main>

        <CompaniesDialogs users={users} />
      </CompaniesProvider>
    </AppLayout>
  )
}
