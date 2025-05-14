import React from 'react'
import { Link } from '@inertiajs/react'

import { UserAvatar } from '#common/ui/components/user_avatar'
import { CompanyList, handleCompanyChange } from '#common/ui/components/company_switcher'

import { LucideIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

import UserDto from '#users/dtos/user'
import { usePage } from '@inertiajs/react'

export type NavUserOptionsGroup = {
  title: string
  url: string
  icon: LucideIcon
  shortcut?: string
}[]

export interface NavUserProps {
  user: UserDto
  options: NavUserOptionsGroup[]
  companies?: any[]
  currentCompany?: any
}

export function NavUser({ user, options, companies, currentCompany }: NavUserProps) {
  const pageProps = usePage().props as any
  const userCompanies = companies || pageProps.companies || []
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <UserAvatar 
            className="cursor-pointer" 
            user={{
              fullName: user.fullName,
              email: user.email || '',
              avatarUrl: user.avatarUrl
            }} 
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side="bottom" align="end">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <UserAvatar 
              className="rounded-lg" 
              user={{
                fullName: user.fullName,
                email: user.email || '',
                avatarUrl: user.avatarUrl
              }} 
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.fullName ?? ''}</span>
              <span className="truncate text-xs">{user.email || ''}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Show company list if available */}
        {userCompanies && userCompanies.length > 0 && (
          <>
            <CompanyList 
              companies={userCompanies} 
              currentCompany={currentCompany || userCompanies.find((c: any) => c.pivot?.is_primary)} 
              onCompanyChange={handleCompanyChange} 
            />
            <DropdownMenuSeparator />
          </>
        )}
        
        {options.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {groupIndex > 0 && <DropdownMenuSeparator />}

            {group.map((option) => (
              <Link key={option.title} href={option.url}>
                <DropdownMenuItem className="cursor-pointer">
                  <option.icon className="mr-2 size-4" />
                  <span>{option.title}</span>
                  {option.shortcut && (
                    <DropdownMenuShortcut>{option.shortcut}</DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              </Link>
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
