import React from 'react'
import { Link } from '@inertiajs/react'
import { Building2, Globe, Mail, Phone, MapPin, User, Calendar, Pencil, ArrowLeft, Trash2, ExternalLink, Clock, Info, Briefcase } from 'lucide-react'

import AppLayout from '#common/ui/components/app_layout'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'

export default function Show({ company }) {
  // Format dates nicely
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Get initials for avatar fallback
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Extract industry from custom data if available
  const industry = company.customData?.industry || 'Technology'
  const foundedYear = company.customData?.founded || 'N/A'

  return (
    <AppLayout breadcrumbs={[{ label: 'Companies', href: '/companies' }, { label: company.name }]}>
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Top navigation and actions */}
        <div className="mb-8 flex items-center justify-between">
          <Link 
            href="/companies" 
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Companies
          </Link>
          
          <div className="flex space-x-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/companies/${company.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button variant="destructive" size="sm" asChild>
              <Link
                href={`/companies/${company.id}`}
                method="delete"
                as="button"
                onClick={(e) => {
                  if (!confirm('Are you sure you want to delete this company?')) {
                    e.preventDefault()
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main company info */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <Avatar className="h-16 w-16 mr-4">
                  {company.logoUrl ? (
                    <AvatarImage src={company.logoUrl} alt={company.name} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {getInitials(company.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <CardTitle className="text-2xl font-bold">{company.name}</CardTitle>
                  <Badge variant="outline" className="mt-1">{industry}</Badge>
                  {company.website && (
                    <div className="mt-2 flex items-center text-sm text-muted-foreground">
                      <Globe className="mr-1 h-4 w-4" />
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline flex items-center"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <Separator className="my-2" />
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium flex items-center">
                    <Info className="mr-2 h-5 w-5 text-muted-foreground" />
                    About
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {company.description || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Contact Information */}
                  <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-primary" />
                      Contact Information
                    </h4>
                    <div className="space-y-3 mt-3">
                      {company.email && (
                        <div className="flex items-center">
                          <div className="w-8 flex-shrink-0 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                          </div>
                          <a href={`mailto:${company.email}`} className="hover:underline">
                            {company.email}
                          </a>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center">
                          <div className="w-8 flex-shrink-0 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                          </div>
                          <a href={`tel:${company.phone}`} className="hover:underline">
                            {company.phone}
                          </a>
                        </div>
                      )}
                      {!company.email && !company.phone && (
                        <div className="text-muted-foreground italic">No contact information provided</div>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-medium flex items-center">
                      <MapPin className="mr-2 h-4 w-4 text-primary" />
                      Location
                    </h4>
                    <div className="space-y-1 mt-3">
                      {company.address || company.city || company.state || company.postalCode || company.country ? (
                        <>
                          {company.address && (
                            <div className="flex items-center">
                              <div className="w-8 flex-shrink-0 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                              </div>
                              <span>{company.address}</span>
                            </div>
                          )}
                          {(company.city || company.state || company.postalCode) && (
                            <div className="flex items-center">
                              <div className="w-8 flex-shrink-0"></div>
                              <span>{[company.city, company.state, company.postalCode].filter(Boolean).join(', ')}</span>
                            </div>
                          )}
                          {company.country && (
                            <div className="flex items-center">
                              <div className="w-8 flex-shrink-0"></div>
                              <span>{company.country}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-muted-foreground italic">No address provided</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side panel with additional info */}
          <div className="space-y-6">
            {/* Company Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Owner */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Owner</div>
                  {company.owner ? (
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(company.owner.fullName || company.owner.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{company.owner.fullName || company.owner.email}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">No owner assigned</span>
                  )}
                </div>

                {/* Founded */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Founded</div>
                  <div className="flex items-center">
                    <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{foundedYear}</span>
                  </div>
                </div>

                {/* Created */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Created</div>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(company.createdAt)}</span>
                  </div>
                </div>

                {/* Last Updated */}
                {company.updatedAt && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Last Updated</div>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(company.updatedAt)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity or Stats Card - can be expanded later */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity</CardTitle>
                <CardDescription>Recent company activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6 text-muted-foreground">
                  <p>No recent activity</p>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button variant="outline" size="sm" className="w-full">
                  View All Activity
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
