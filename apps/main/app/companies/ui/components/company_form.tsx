import React, { useRef, useState } from 'react'
import { useForm } from '@inertiajs/react'
import { Upload } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Progress } from '@workspace/ui/components/progress'
import { Textarea } from '@workspace/ui/components/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { toast } from '@workspace/ui/hooks/use-toast'

import type CompanyDto from '#companies/dtos/company'
import type UserDto from '#users/dtos/user'

interface Props {
  company?: CompanyDto
  users: UserDto[]
  isEditing?: boolean
}

export function CompanyForm({ company, users, isEditing = false }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)

  const { data, setData, errors, post, put, progress, reset } = useForm({
    name: company?.name || '',
    description: company?.description || '',
    website: company?.website || '',
    email: company?.email || '',
    phone: company?.phone || '',
    address: company?.address || '',
    city: company?.city || '',
    state: company?.state || '',
    postalCode: company?.postalCode || '',
    country: company?.country || '',
    ownerId: company?.ownerId || undefined,
    logo: null as File | null,
  })

  const logoInputRef = useRef<HTMLInputElement>(null)

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

    const url = isEditing && company ? `/companies/${company.id}` : '/companies'
    const method = isEditing ? put : post

    method(url, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        setPreviewUrl(undefined)
        
        toast('Success', {
          description: isEditing ? 'Company updated successfully' : 'Company created successfully',
        })
        
        if (!isEditing) {
          reset()
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-0.5" encType="multipart/form-data">
      <div className="col-span-full flex items-center gap-x-8">
        <div className="h-24 w-24 flex-none">
          {previewUrl || (company?.logoUrl) ? (
            <img 
              src={previewUrl || (company?.logoUrl || '')} 
              alt="Company logo" 
              className="h-24 w-24 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted">
              <Upload className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        <div>
          <Button type="button" onClick={() => logoInputRef.current?.click()}>
            {company?.logoUrl ? 'Change logo' : 'Add logo'}
          </Button>
          <p className="mt-2 text-xs/5 text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
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
        {errors?.name && (
          <p className="text-[0.8rem] font-medium text-destructive">{errors.name}</p>
        )}
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
        {errors?.description && (
          <p className="text-[0.8rem] font-medium text-destructive">{errors.description}</p>
        )}
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
          {errors?.website && (
            <p className="text-[0.8rem] font-medium text-destructive">{errors.website}</p>
          )}
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
          {errors?.email && (
            <p className="text-[0.8rem] font-medium text-destructive">{errors.email}</p>
          )}
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
          {errors?.phone && (
            <p className="text-[0.8rem] font-medium text-destructive">{errors.phone}</p>
          )}
        </div>

        {/* Owner is now managed through user_companies relationship */}
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
        {errors?.address && (
          <p className="text-[0.8rem] font-medium text-destructive">{errors.address}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="city" className="mb-1 text-gray-700">
            City
          </Label>
          <Input
            id="city"
            placeholder="City"
            value={data.city}
            onChange={(e) => setData('city', e.target.value)}
            className={errors?.city ? 'border-red-500' : ''}
          />
          {errors?.city && (
            <p className="text-[0.8rem] font-medium text-destructive">{errors.city}</p>
          )}
        </div>

        <div>
          <Label htmlFor="state" className="mb-1 text-gray-700">
            State/Province
          </Label>
          <Input
            id="state"
            placeholder="State/Province"
            value={data.state}
            onChange={(e) => setData('state', e.target.value)}
            className={errors?.state ? 'border-red-500' : ''}
          />
          {errors?.state && (
            <p className="text-[0.8rem] font-medium text-destructive">{errors.state}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="postalCode" className="mb-1 text-gray-700">
            Postal Code
          </Label>
          <Input
            id="postalCode"
            placeholder="Postal Code"
            value={data.postalCode}
            onChange={(e) => setData('postalCode', e.target.value)}
            className={errors?.postalCode ? 'border-red-500' : ''}
          />
          {errors?.postalCode && (
            <p className="text-[0.8rem] font-medium text-destructive">{errors.postalCode}</p>
          )}
        </div>

        <div>
          <Label htmlFor="country" className="mb-1 text-gray-700">
            Country
          </Label>
          <Input
            id="country"
            placeholder="Country"
            value={data.country}
            onChange={(e) => setData('country', e.target.value)}
            className={errors?.country ? 'border-red-500' : ''}
          />
          {errors?.country && (
            <p className="text-[0.8rem] font-medium text-destructive">{errors.country}</p>
          )}
        </div>
      </div>

      {progress && (
        <Progress
          value={progress.percentage}
          className="w-full h-2 bg-gray-200 rounded mt-2"
        />
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" className="mr-3" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Update Company' : 'Create Company'}
        </Button>
      </div>
    </form>
  )
}
