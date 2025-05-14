import React, { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Label } from '@workspace/ui/components/label'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { useForm } from '@inertiajs/react'
import CompanyDto from '#companies/dtos/company'
import UserDto from '#users/dtos/user'

interface CompaniesActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: CompanyDto | null
  users: UserDto[]
}

export function CompaniesActionDialog({
  open,
  onOpenChange,
  currentRow,
  users,
}: CompaniesActionDialogProps) {
  const isEditing = !!currentRow
  const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
    name: currentRow?.name || '',
    description: currentRow?.description || '',
    website: currentRow?.website || '',
    email: currentRow?.email || '',
    phone: currentRow?.phone || '',
    address: currentRow?.address || '',
    city: currentRow?.city || '',
    state: currentRow?.state || '',
    postalCode: currentRow?.postalCode || '',
    country: currentRow?.country || '',
    // Owner is now managed through user_companies relationship
    logo: null as File | null,
    customData: currentRow?.customData || {},
  })

  // Reset form when dialog opens/closes or currentRow changes
  useEffect(() => {
    if (open) {
      setData({
        name: currentRow?.name || '',
        description: currentRow?.description || '',
        website: currentRow?.website || '',
        email: currentRow?.email || '',
        phone: currentRow?.phone || '',
        address: currentRow?.address || '',
        city: currentRow?.city || '',
        state: currentRow?.state || '',
        postalCode: currentRow?.postalCode || '',
        country: currentRow?.country || '',
        // Owner is now managed through user_companies relationship
        logo: null,
        customData: currentRow?.customData || {},
      })
      clearErrors()
    }
  }, [open, currentRow])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'logo' && value) {
        formData.append(key, value)
      } else if (key === 'customData' && value) {
        formData.append(key, JSON.stringify(value))
      } else if (value !== null && value !== undefined) {
        formData.append(key, String(value))
      }
    })

    if (isEditing && currentRow) {
      put(`/companies/${currentRow.id}`, {
        data: formData,
        onSuccess: () => {
          onOpenChange(false)
          reset()
        },
      })
    } else {
      post('/companies', {
        data: formData,
        onSuccess: () => {
          onOpenChange(false)
          reset()
        },
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Company' : 'Add Company'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the company information below.'
              : 'Fill out the form below to create a new company.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name" className="mb-1 text-gray-700">
                Company Name*
              </Label>
              <Input
                id="name"
                placeholder="Acme Inc."
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                className={errors?.name ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive">{errors?.name}</p>
            </div>

            <div>
              <Label htmlFor="website" className="mb-1 text-gray-700">
                Website
              </Label>
              <Input
                id="website"
                placeholder="https://example.com"
                value={data.website}
                onChange={(e) => setData('website', e.target.value)}
                className={errors?.website ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive">{errors?.website}</p>
            </div>

            <div className="col-span-2">
              <Label htmlFor="description" className="mb-1 text-gray-700">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="A brief description of the company"
                value={data.description || ''}
                onChange={(e) => setData('description', e.target.value)}
                className={errors?.description ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive">{errors?.description}</p>
            </div>

            <div>
              <Label htmlFor="email" className="mb-1 text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                placeholder="contact@example.com"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className={errors?.email ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive">{errors?.email}</p>
            </div>

            <div>
              <Label htmlFor="phone" className="mb-1 text-gray-700">
                Phone
              </Label>
              <Input
                id="phone"
                placeholder="+1 (555) 123-4567"
                value={data.phone}
                onChange={(e) => setData('phone', e.target.value)}
                className={errors?.phone ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                {errors?.phone}
              </p>
            </div>

            {/* Owner field removed - now managed through user_companies relationship */}
          </div>

          <div>
            <Label htmlFor="address" className="mb-1 text-gray-700">
              Address
            </Label>
            <Input
              id="address"
              placeholder="123 Main St"
              value={data.address}
              onChange={(e) => setData('address', e.target.value)}
              className={errors?.address ? 'border-red-500' : ''}
            />
            <p className="text-[0.8rem] font-medium text-destructive">{errors?.address}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city" className="mb-1 text-gray-700">
                City
              </Label>
              <Input
                id="city"
                placeholder="New York"
                value={data.city}
                onChange={(e) => setData('city', e.target.value)}
                className={errors?.city ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive">{errors?.city}</p>
            </div>

            <div>
              <Label htmlFor="state" className="mb-1 text-gray-700">
                State/Province
              </Label>
              <Input
                id="state"
                placeholder="NY"
                value={data.state}
                onChange={(e) => setData('state', e.target.value)}
                className={errors?.state ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive">{errors?.state}</p>
            </div>

            <div>
              <Label htmlFor="postalCode" className="mb-1 text-gray-700">
                Postal Code
              </Label>
              <Input
                id="postalCode"
                placeholder="10001"
                value={data.postalCode}
                onChange={(e) => setData('postalCode', e.target.value)}
                className={errors?.postalCode ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive">{errors?.postalCode}</p>
            </div>

            <div>
              <Label htmlFor="country" className="mb-1 text-gray-700">
                Country
              </Label>
              <Input
                id="country"
                placeholder="USA"
                value={data.country}
                onChange={(e) => setData('country', e.target.value)}
                className={errors?.country ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive">{errors?.country}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="logo" className="mb-1 text-gray-700">
              Logo
            </Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setData('logo', file)
              }}
              className={errors?.logo ? 'border-red-500' : ''}
            />
            <p className="text-[0.8rem] font-medium text-destructive">{errors?.logo}</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
