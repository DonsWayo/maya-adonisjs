import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { InferPageProps } from '@adonisjs/inertia/types'
import Layout from '#auth/ui/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Progress } from '@workspace/ui/components/progress'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import AIUsageController from '#ai_usage/controllers/ai_usage_controller'
import { toast } from '@workspace/ui/hooks/use-toast'

type LimitPeriod = 'daily' | 'weekly' | 'monthly'

export default function AIUsageLimits({ 
  limits 
}: InferPageProps<AIUsageController, 'limits'>) {
  const [isEditing, setIsEditing] = useState<LimitPeriod | null>(null)
  const [formData, setFormData] = useState({
    maxRequests: '',
    maxTokens: '',
    maxCostCents: '',
    warningThresholdPercent: '80'
  })

  const handleEdit = (period: LimitPeriod, limit?: any) => {
    setIsEditing(period)
    if (limit) {
      setFormData({
        maxRequests: limit.maxRequests?.toString() || '',
        maxTokens: limit.maxTokens?.toString() || '',
        maxCostCents: limit.maxCostCents?.toString() || '',
        warningThresholdPercent: limit.warningThresholdPercent?.toString() || '80'
      })
    } else {
      setFormData({
        maxRequests: '',
        maxTokens: '',
        maxCostCents: '',
        warningThresholdPercent: '80'
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    router.post(`/api/v1/ai-usage/limits/${isEditing}`, {
      maxRequests: formData.maxRequests ? parseInt(formData.maxRequests) : undefined,
      maxTokens: formData.maxTokens ? parseInt(formData.maxTokens) : undefined,
      maxCostCents: formData.maxCostCents ? parseInt(formData.maxCostCents) : undefined,
      warningThresholdPercent: parseInt(formData.warningThresholdPercent)
    }, {
      onSuccess: () => {
        toast.success(`${isEditing} limits updated successfully`)
        setIsEditing(null)
      },
      onError: () => {
        toast.error('Failed to update limits')
      }
    })
  }

  const getLimitForPeriod = (period: LimitPeriod) => {
    return limits.find(l => l.period === period)
  }

  const renderLimitCard = (period: LimitPeriod) => {
    const limit = getLimitForPeriod(period)
    const isActive = limit && new Date(limit.periodEnd) > new Date()
    
    if (isEditing === period) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{period} Limits</CardTitle>
            <CardDescription>Configure usage limits for {period} period</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="maxRequests">Max Requests</Label>
                <Input
                  id="maxRequests"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={formData.maxRequests}
                  onChange={(e) => setFormData({ ...formData, maxRequests: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="maxCostCents">Max Cost (cents)</Label>
                <Input
                  id="maxCostCents"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  value={formData.maxCostCents}
                  onChange={(e) => setFormData({ ...formData, maxCostCents: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="warningThresholdPercent">Warning Threshold (%)</Label>
                <Input
                  id="warningThresholdPercent"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.warningThresholdPercent}
                  onChange={(e) => setFormData({ ...formData, warningThresholdPercent: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )
    }

    if (!limit || !isActive) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">{period} Limits</CardTitle>
            <CardDescription>No active limits configured</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => handleEdit(period)}>Configure Limits</Button>
          </CardContent>
        </Card>
      )
    }

    const requestsPercentage = limit.maxRequests 
      ? (limit.currentRequests / limit.maxRequests) * 100 
      : 0
    const tokensPercentage = limit.maxTokens 
      ? (limit.currentTokens / limit.maxTokens) * 100 
      : 0
    const costPercentage = limit.maxCostCents 
      ? (limit.currentCostCents / limit.maxCostCents) * 100 
      : 0

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="capitalize">{period} Limits</CardTitle>
              <CardDescription>
                Period ends: {new Date(limit.periodEnd).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {limit.warningSent && (
                <Badge variant="outline" className="text-yellow-600">
                  Warning Sent
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={() => handleEdit(period, limit)}>
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {limit.maxRequests && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Requests</span>
                <span className="text-sm text-muted-foreground">
                  {limit.currentRequests} / {limit.maxRequests}
                </span>
              </div>
              <Progress value={requestsPercentage} />
            </div>
          )}
          
          {limit.maxTokens && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Tokens</span>
                <span className="text-sm text-muted-foreground">
                  {limit.currentTokens.toLocaleString()} / {limit.maxTokens.toLocaleString()}
                </span>
              </div>
              <Progress value={tokensPercentage} />
            </div>
          )}
          
          {limit.maxCostCents && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Cost</span>
                <span className="text-sm text-muted-foreground">
                  ${(limit.currentCostCents / 100).toFixed(2)} / ${(limit.maxCostCents / 100).toFixed(2)}
                </span>
              </div>
              <Progress value={costPercentage} />
            </div>
          )}
          
          {(requestsPercentage >= limit.warningThresholdPercent || 
            tokensPercentage >= limit.warningThresholdPercent || 
            costPercentage >= limit.warningThresholdPercent) && (
            <Alert>
              <AlertDescription>
                Usage is approaching the configured limits. Consider increasing limits or optimizing usage.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Head title="AI Usage Limits" />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">AI Usage Limits</h1>
          </div>

          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
            
            <TabsContent value="daily">
              {renderLimitCard('daily')}
            </TabsContent>
            
            <TabsContent value="weekly">
              {renderLimitCard('weekly')}
            </TabsContent>
            
            <TabsContent value="monthly">
              {renderLimitCard('monthly')}
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </>
  )
}