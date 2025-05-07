import React, { createContext, useContext, useState, ReactNode } from 'react'

import type CompanyDto from '#companies/dtos/company'

type OpenState = 'add' | 'edit' | 'delete' | null

interface CompaniesContextType {
  open: OpenState
  setOpen: (state: OpenState) => void
  currentRow: CompanyDto | null
  setCurrentRow: (row: CompanyDto | null) => void
}

const CompaniesContext = createContext<CompaniesContextType | undefined>(undefined)

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<OpenState>(null)
  const [currentRow, setCurrentRow] = useState<CompanyDto | null>(null)

  const handleSetOpen = (state: OpenState) => {
    setOpen((prev) => (prev === state ? null : state))
  }

  return (
    <CompaniesContext.Provider
      value={{
        open,
        setOpen: handleSetOpen,
        currentRow,
        setCurrentRow,
      }}
    >
      {children}
    </CompaniesContext.Provider>
  )
}

export function useCompanies() {
  const context = useContext(CompaniesContext)
  if (context === undefined) {
    throw new Error('useCompanies must be used within a CompaniesProvider')
  }
  return context
}
