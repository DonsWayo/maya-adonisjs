import React from 'react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Calendar } from '@workspace/ui/components/calendar'
import { Search, Filter, Calendar as CalendarIcon, X } from 'lucide-react'
import { DateTime } from 'luxon'

interface ErrorFiltersProps {
  filters: {
    search?: string
    level?: string
    environment?: string
    startDate?: Date
    endDate?: Date
  }
  onFilterChange: (name: string, value: any) => void
  onClearFilters: () => void
  environments: string[]
}

export function ErrorFilters({ filters, onFilterChange, onClearFilters, environments }: ErrorFiltersProps) {
  const formatDate = (date?: Date) => {
    return date ? DateTime.fromJSDate(date).toFormat('LLL dd, yyyy') : ''
  }

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
      <div className="relative flex-grow">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search errors..."
          className="pl-8"
          value={filters.search || ''}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
      </div>
      
      <Select
        value={filters.level || ''}
        onValueChange={(value) => onFilterChange('level', value)}
      >
        <SelectTrigger className="w-[150px]">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <SelectValue placeholder="Level" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Levels</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="info">Info</SelectItem>
        </SelectContent>
      </Select>
      
      <Select
        value={filters.environment || ''}
        onValueChange={(value) => onFilterChange('environment', value)}
      >
        <SelectTrigger className="w-[150px]">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <SelectValue placeholder="Environment" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Environments</SelectItem>
          {environments.map(env => (
            <SelectItem key={env} value={env}>{env}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.startDate && filters.endDate
              ? `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`
              : filters.startDate
              ? `From ${formatDate(filters.startDate)}`
              : filters.endDate
              ? `Until ${formatDate(filters.endDate)}`
              : "Date Range"
            }
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{
              from: filters.startDate || undefined,
              to: filters.endDate || undefined,
            }}
            onSelect={(range) => {
              onFilterChange('dateRange', {
                startDate: range?.from,
                endDate: range?.to,
              })
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      {(filters.search || filters.level || filters.environment || filters.startDate || filters.endDate) && (
        <Button variant="ghost" size="icon" onClick={onClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
