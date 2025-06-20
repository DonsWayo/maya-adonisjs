import React from 'react'

import { NavUserOptionsGroup } from '#common/ui/components/nav_user'
import AppSidebarLayout from '#common/ui/components/app_sidebar_layout'
import AppHeaderLayout from '#common/ui/components/app_header_layout'
import { NavMainItem } from '#common/ui/types/nav_main'

import useUser from '#auth/ui/hooks/use_user'
import AbilityProvider from '#common/ui/context/abilities_context'

import { ThemeProvider } from '@workspace/ui/components/theme-provider'
import { Toaster } from '@workspace/ui/components/sonner'
import { LogOut, Settings, Users, Building, FolderOpen, AlertCircle, BarChart3, Home } from 'lucide-react'

interface BreadcrumbItemProps {
  label: string
  href?: string
}

interface AppLayoutProps extends React.PropsWithChildren {
  breadcrumbs?: BreadcrumbItemProps[]
  layout?: 'sidebar' | 'header'
}

const navMain: NavMainItem[] = [
  {
    title: 'Home',
    url: '/',
    icon: Home,
  },
  {
    title: 'Error Monitoring',
    items: [
      {
        title: 'Projects',
        url: '/projects',
        icon: FolderOpen,
        subject: 'projects',
      },
      {
        title: 'All Errors',
        url: '/errors',
        icon: AlertCircle,
        subject: 'errors',
      },
      {
        title: 'Analytics',
        url: '/analytics',
        icon: BarChart3,
        subject: 'analytics',
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        title: 'Users',
        url: '/users',
        icon: Users,
        subject: 'users',
      },
      {
        title: 'Companies',
        url: '/companies',
        icon: Building,
        subject: 'companies',
      },
    ],
  },
]

export const navUser: NavUserOptionsGroup[] = [
  [
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings,
    },
  ],
  [
    {
      title: 'Log out',
      url: '/logout',
      icon: LogOut,
    },
  ],
]

export default function AppLayout({
  children,
  breadcrumbs = [],
  layout = 'header',
}: AppLayoutProps) {
  const user = useUser()

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AbilityProvider>
        <Toaster />

        {layout === 'header' ? (
          <AppHeaderLayout
            user={user}
            navMain={navMain}
            navUser={navUser}
            breadcrumbs={breadcrumbs}
          >
            {children}
          </AppHeaderLayout>
        ) : (
          <AppSidebarLayout
            user={user}
            navMain={navMain}
            navUser={navUser}
            breadcrumbs={breadcrumbs}
          >
            {children}
          </AppSidebarLayout>
        )}
      </AbilityProvider>
    </ThemeProvider>
  )
}
