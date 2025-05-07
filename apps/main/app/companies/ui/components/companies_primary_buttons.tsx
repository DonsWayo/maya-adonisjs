import React from 'react'
import { Button } from '@workspace/ui/components/button'
// Removed Lucide icon import to avoid TypeScript errors
import { useCompanies } from '#companies/ui/context/companies_context'

export function CompaniesPrimaryButtons() {
  const { setOpen } = useCompanies()

  return (
    <Button onClick={() => setOpen('add')} size="sm">
      <span className="mr-2">+</span>
      Add Company
    </Button>
  )
}
