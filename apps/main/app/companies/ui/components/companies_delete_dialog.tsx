import React, { useState } from 'react'
import { useForm } from '@inertiajs/react'

// Removed Lucide icon import to avoid TypeScript errors
import { toast } from '@workspace/ui/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Input } from '@workspace/ui/components/input'

import { ConfirmDialog } from '#common/ui/components/confirm_dialog'

import type CompanyDto from '#companies/dtos/company'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: CompanyDto
}

export function CompaniesDeleteDialog({ open, onOpenChange, currentRow }: Props) {
  const [value, setValue] = useState('')
  const { delete: destroy } = useForm()

  const handleDelete = () => {
    if (value.trim() !== currentRow.name) return

    destroy(`/companies/${currentRow?.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        onOpenChange(false)
        toast('The following company has been deleted:', {
          description: (
            <div className="mt-2 max-w-[320px] overflow-x-auto rounded-md bg-slate-950 p-4">
              <pre className="text-white whitespace-pre-wrap break-words">
                <code>{JSON.stringify(currentRow, null, 2)}</code>
              </pre>
            </div>
          ),
        })
      },
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.name}
      title={
        <span className="text-destructive flex items-center gap-2">
          <span className="mr-1 inline-block text-destructive">⚠️</span>
          <span>Delete Company</span>
        </span>
      }
      desc={
        <div className="space-y-4">
          <p className="mb-2">
            Are you sure you want to delete <span className="font-bold">{currentRow.name}</span>
            ?
            <br />
            This action will permanently remove the company and all associated data from the system. This cannot be
            undone.
          </p>

          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter company name to confirm deletion."
          />

          <Alert variant="destructive">
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Please be careful, this operation cannot be rolled back.
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText="Delete"
      destructive
    />
  )
}
