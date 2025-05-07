import React, { useRef } from 'react'
import { useForm } from '@inertiajs/react'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Label } from '@workspace/ui/components/label'
import { Progress } from '@workspace/ui/components/progress'
import { toast } from '@workspace/ui/hooks/use-toast'
// Removed Building2 import to avoid TypeScript errors

import type CompanyDto from '#companies/dtos/company'
import type UserDto from '#users/dtos/user'

interface Props {
  users: UserDto[]
  currentRow?: CompanyDto
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CompaniesActionDialog({ users, currentRow, open, onOpenChange }: Props) {
  const isEdit = !!currentRow
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(undefined)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { data, setData, errors, post, put, progress, clearErrors, reset } = useForm({
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
    ownerId: currentRow?.ownerId || '',
    logo: null as File | null,
  })

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setData('logo', file)
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(undefined)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const formData = new FormData()
    
    // Append all form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'logo') {
        formData.append(key, String(value))
      }
    })
    
    // Append logo if selected
    if (data.logo) {
      formData.append('logo', data.logo)
    }

    const url = isEdit && currentRow ? `/companies/${currentRow.id}` : '/companies'
    const method = isEdit ? put : post

    method(url, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        onOpenChange(false)
        setTimeout(() => {
          reset()
          clearErrors()
          setPreviewUrl(undefined)
        }, 500)
        
        toast('Success', {
          description: isEdit ? 'Company updated successfully' : 'Company created successfully',
        })
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        onOpenChange(state)
        setTimeout(() => {
          reset()
          clearErrors()
          setPreviewUrl(undefined)
        }, 500)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? 'Edit Company' : 'Add Company'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the company here. ' : ' Fill in the details below to add a new company. '}
            Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="w-full pr-4 -mr-4 py-1 max-h-[60vh]">
          <form id="company-form" onSubmit={handleSubmit} className="space-y-4 p-0.5" encType="multipart/form-data">
            <div className="col-span-full flex items-center gap-x-8">
              <div className="h-16 w-16 flex-none">
                {previewUrl !== undefined || currentRow?.logoUrl ? (
                  <img 
                    src={previewUrl !== undefined ? previewUrl : (currentRow?.logoUrl || '')}
                    alt="Company logo" 
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                    <div className="text-gray-400 text-xl font-bold">Co.</div>
                  </div>
                )}
              </div>

              <div>
                <Button type="button" onClick={() => logoInputRef.current?.click()}>
                  {currentRow?.logoUrl ? 'Change logo' : 'Add logo'}
                </Button>
                <p className="mt-2 text-xs/5">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <Input
              ref={logoInputRef}
              id="logo"
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/gif"
              onChange={handleLogoChange}
            />

            {errors?.logo && (
              <p className="text-[0.8rem] font-medium text-destructive">{errors.logo}</p>
            )}

            <div>
              <Label htmlFor="name" className="mb-1 text-gray-700">
                Company Name *
              </Label>
              <Input
                id="name"
                placeholder="Enter company name"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                className={errors?.name ? 'border-red-500' : ''}
              />
              <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                {errors?.name}
              </p>
            </div>

            <div>
              <Label htmlFor="description" className="mb-1 text-gray-700">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Enter company description"
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                className={errors?.description ? 'border-red-500' : ''}
                rows={3}
              />
              <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                {errors?.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="website" className="mb-1 text-gray-700">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={data.website}
                  onChange={(e) => setData('website', e.target.value)}
                  className={errors?.website ? 'border-red-500' : ''}
                />
                <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                  {errors?.website}
                </p>
              </div>

              <div>
                <Label htmlFor="email" className="mb-1 text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@example.com"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  className={errors?.email ? 'border-red-500' : ''}
                />
                <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                  {errors?.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone" className="mb-1 text-gray-700">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={data.phone}
                  onChange={(e) => setData('phone', e.target.value)}
                  className={errors?.phone ? 'border-red-500' : ''}
                />
                <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                  {errors?.phone}
                </p>
              </div>

              <div>
                <Label htmlFor="ownerId" className="mb-1 text-gray-700">
                  Owner
                </Label>
                <select
                  id="ownerId"
                  value={data.ownerId}
                  onChange={(e) => setData('ownerId', e.target.value)}
                  className={`w-full rounded-md border ${errors?.ownerId ? 'border-red-500' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                >
                  <option value="">Select an owner</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName || user.email}
                    </option>
                  ))}
                </select>
                <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                  {errors?.ownerId}
                </p>
              </div>
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
              <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                {errors?.address}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                  {errors?.city}
                </p>
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
                <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                  {errors?.state}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                  {errors?.postalCode}
                </p>
              </div>

              <div>
                <Label htmlFor="country" className="mb-1 text-gray-700">
                  Country
                </Label>
                <Input
                  id="country"
                  placeholder="United States"
                  value={data.country}
                  onChange={(e) => setData('country', e.target.value)}
                  className={errors?.country ? 'border-red-500' : ''}
                />
                <p className="text-[0.8rem] font-medium text-destructive col-span-4 col-start-3">
                  {errors?.country}
                </p>
              </div>
            </div>

            {progress && (
              <Progress
                value={progress.percentage}
                max={100}
                className="w-full h-2 bg-gray-200 rounded mt-2"
              />
            )}
          </form>
        </ScrollArea>
        <DialogFooter className="gap-y-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="company-form">
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
