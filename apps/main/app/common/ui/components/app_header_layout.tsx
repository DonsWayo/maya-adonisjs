import React, { useMemo } from 'react'
import { usePage } from '@inertiajs/react'

import { NavUser, NavUserOptionsGroup } from '#common/ui/components/nav_user'
import { AppLogo } from '#common/ui/components/app_logo'
import { NavHeaderMain } from '#common/ui/components/nav_header_main'
import { NavHeaderMobile } from '#common/ui/components/nav_header_mobile'
import { ToggleTheme } from '#common/ui/components/toggle_theme'
import { NavMainItem } from '#common/ui/types/nav_main'
import Breadcrumb from '#common/ui/components/breadcrumbs'
import { AppSwitcher } from '#common/ui/components/company_switcher'

import UserDto from '#users/dtos/user'
import { Building, BarChart, Settings, Users } from 'lucide-react'

interface BreadcrumbItemProps {
  label: string
  href?: string
}

interface AppLayoutProps extends React.PropsWithChildren {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItemProps[]
  navMain: NavMainItem[]
  navUser: NavUserOptionsGroup[]
  user: UserDto
}

export default function AppHeaderLayout({
  children,
  breadcrumbs = [],
  navMain,
  navUser,
  user: propUser,
}: AppLayoutProps) {
  // Get user from props or page props
  const { user } = usePage().props as any
  
  // Find the primary company for the user
  const currentCompany = useMemo(() => {
    if (!user?.companies || !Array.isArray(user.companies)) return null
    return user.companies.find((company: any) => company.pivot?.is_primary === true) || user.companies[0]
  }, [user?.companies])

  // Define available apps
  const apps = useMemo(() => [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      icon: <Building className="size-4" />, 
      url: '/dashboard',
      description: 'Main dashboard' 
    },
    { 
      id: 'analytics', 
      name: 'Analytics', 
      icon: <BarChart className="size-4" />, 
      url: '/analytics',
      description: 'View analytics' 
    },
    { 
      id: 'settings', 
      name: 'Settings', 
      icon: <Settings className="size-4" />, 
      url: '/settings',
      description: 'App settings' 
    },
    { 
      id: 'users', 
      name: 'Users', 
      icon: <Users className="size-4" />, 
      url: '/users',
      description: 'Manage users' 
    },
  ], [])

  // Determine current app based on URL
  const currentAppId = useMemo(() => {
    const path = window.location.pathname
    if (path.includes('/analytics')) return 'analytics'
    if (path.includes('/settings')) return 'settings'
    if (path.includes('/users')) return 'users'
    return 'dashboard' // Default
  }, [])
  return (
    <>
      <div className="border-sidebar-border/80 border-b">
        <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
          <NavHeaderMobile items={navMain} />

          <AppLogo />

          <div className="ml-6 hidden h-full items-center space-x-6 lg:flex">
            <NavHeaderMain items={navMain} />
          </div>

          <div className="ml-auto flex items-center space-x-2">
            <div className="relative flex items-center space-x-4">
              <AppSwitcher
                apps={apps}
                currentAppId={currentAppId}
              />
              <ToggleTheme />
              <NavUser 
                user={propUser} 
                options={navUser} 
                companies={user?.companies || []}
                currentCompany={currentCompany}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-sidebar-border/70 flex w-full border-b">
        <Breadcrumb breadcrumbs={breadcrumbs} />
      </div>

      <main className="mx-auto px-2 flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl">
        {children}
      </main>
    </>
  )
}
