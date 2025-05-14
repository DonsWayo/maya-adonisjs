import React from 'react'
import { Link, router } from '@inertiajs/react'
import { Building, LayoutGrid } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'

import {
  Button
} from '@workspace/ui/components/button'

import { cn } from '@workspace/ui/lib/utils'

// Company list component for the user dropdown menu
export function CompanyList({ companies, currentCompany, onCompanyChange }: {
  companies: any[]
  currentCompany?: any
  onCompanyChange: (companyId: string) => void
}) {
  if (!companies || companies.length === 0) {
    return null
  }

  return (
    <div className="space-y-1 px-2 py-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">COMPANIES</div>
      {companies.map((company) => (
        <Button
          key={company.id}
          variant={company.id === currentCompany?.id ? "secondary" : "ghost"}
          className="w-full justify-start gap-2 h-9"
          onClick={() => onCompanyChange(company.id)}
        >
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="size-4 rounded-sm" />
          ) : (
            <Building className="size-4" />
          )}
          <span>{company.name}</span>
          {company.pivot?.role && (
            <span className="ml-auto text-xs text-muted-foreground">{company.pivot.role}</span>
          )}
        </Button>
      ))}
    </div>
  )
}

interface AppOption {
  id: string
  name: string
  icon: React.ReactNode
  url: string
  description?: string
}

interface AppSwitcherProps {
  apps: AppOption[]
  currentAppId?: string
}

export function AppSwitcher({ apps, currentAppId }: AppSwitcherProps) {
  if (!apps || apps.length === 0) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <LayoutGrid className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="grid grid-cols-2 gap-2">
          {apps.map((app) => (
            <Link key={app.id} href={app.url}>
              <Button
                variant={app.id === currentAppId ? "secondary" : "ghost"}
                className={cn(
                  "flex flex-col h-auto items-center justify-start gap-1 p-3 w-full",
                  app.id === currentAppId && "bg-secondary"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  {app.icon}
                </div>
                <span className="text-xs font-medium">{app.name}</span>
              </Button>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Export a function to handle company switching for use in the NavUser component
export function handleCompanyChange(companyId: string) {
  router.visit(`/companies/${companyId}/switch`, {
    method: 'post',
    preserveState: true,
    preserveScroll: true,
    only: ['user', 'companies']
  })
}

// Export the CompanyAndAppSwitcher component for the AppHeaderLayout
export function CompanyAndAppSwitcher({ apps, currentAppId }: { apps: AppOption[], currentAppId?: string }) {
  if (!apps?.length) {
    return null
  }
  
  return (
    <AppSwitcher 
      apps={apps} 
      currentAppId={currentAppId} 
    />
  )
}
