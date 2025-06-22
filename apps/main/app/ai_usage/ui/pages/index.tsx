import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import { InferPageProps } from '@adonisjs/inertia/types'
import Layout from '#auth/ui/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { Progress } from '@workspace/ui/components/progress'
import { LineChart, BarChart, PieChart } from '@workspace/ui/components/charts'
import AIUsageController from '#ai_usage/controllers/ai_usage_controller'

export default function AIUsageDashboard({ 
  summary 
}: InferPageProps<AIUsageController, 'index'>) {
  const [dateRange, setDateRange] = useState('30')

  // Calculate cost in dollars
  const totalCostDollars = (summary.stats.totalCostCents / 100).toFixed(2)
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  return (
    <>
      <Head title="AI Usage Dashboard" />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">AI Usage Dashboard</h1>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.stats.totalRequests.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Success rate: {summary.stats.successRate.toFixed(1)}%
                </p>
                <Progress value={summary.stats.successRate} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tokens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.stats.totalTokens.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg per request: {Math.round(summary.stats.totalTokens / summary.stats.totalRequests)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCostDollars}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg per request: ${(summary.stats.totalCostCents / summary.stats.totalRequests / 100).toFixed(3)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Latency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.stats.averageLatencyMs}ms</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Error rate: {summary.stats.errorRate.toFixed(1)}%
                </p>
                <Progress value={100 - summary.stats.errorRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={summary.timeline}
                xAxisDataKey="date"
                lines={[
                  { dataKey: "requests", yAxisId: "left", name: "Requests" },
                  { dataKey: "costCents", yAxisId: "right", name: "Cost (¢)" }
                ]}
                config={{
                  requests: {
                    label: "Requests",
                    color: "#8884d8",
                  },
                  costCents: {
                    label: "Cost (¢)",
                    color: "#82ca9d",
                  },
                }}
                leftYAxis
                rightYAxis
                height={300}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={summary.byProvider}
                  xAxisDataKey="provider"
                  bars={[
                    { dataKey: "requests", name: "Requests" },
                    { dataKey: "tokens", name: "Tokens" }
                  ]}
                  config={{
                    requests: {
                      label: "Requests",
                      color: "#8884d8",
                    },
                    tokens: {
                      label: "Tokens",
                      color: "#82ca9d",
                    },
                  }}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Model Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Model</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={summary.byModel}
                  dataKey="costCents"
                  config={{
                    costCents: {
                      label: "Cost",
                    },
                  }}
                  labelRenderer={(entry) => `${entry.model}: $${(entry.costCents / 100).toFixed(2)}`}
                  colors={COLORS}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>

          {/* Feature Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.byFeature.map((feature) => {
                  const percentage = (feature.costCents / summary.stats.totalCostCents) * 100
                  return (
                    <div key={feature.feature} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">
                            {feature.feature.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {feature.requests} requests • {feature.tokens.toLocaleString()} tokens
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${(feature.costCents / 100).toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </>
  )
}