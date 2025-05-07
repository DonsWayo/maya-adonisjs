import React from 'react'
import { useCompanies } from '#companies/ui/context/companies_context'
import { CompaniesActionDialog } from '#companies/ui/components/companies_action_dialog'
import { CompaniesDeleteDialog } from '#companies/ui/components/companies_delete_dialog'

import type UserDto from '#users/dtos/user'

export function CompaniesDialogs({ users }: { users: UserDto[] }) {
  const { open, setOpen, currentRow, setCurrentRow } = useCompanies()
  
  return (
    <>
      <CompaniesActionDialog
        key="company-add"
        users={users}
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <CompaniesActionDialog
            key={`company-edit-${currentRow.id}`}
            users={users}
            open={open === 'edit'}
            onOpenChange={() => {
              setOpen('edit')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />

          <CompaniesDeleteDialog
            key={`company-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={() => {
              setOpen('delete')
              setTimeout(() => {
                setCurrentRow(null)
              }, 500)
            }}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
