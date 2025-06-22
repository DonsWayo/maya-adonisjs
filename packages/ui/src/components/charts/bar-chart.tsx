"use client"

import * as React from "react"
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "../chart"
import type { ChartConfig } from "../chart"

interface BarChartProps {
  data: any[]
  bars: {
    dataKey: string
    fill?: string
    name?: string
  }[]
  xAxisDataKey: string
  config: ChartConfig
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  xAxisFormatter?: (value: any) => string
  className?: string
}

export function BarChart({
  data,
  bars,
  xAxisDataKey,
  config,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  xAxisFormatter,
  className
}: BarChartProps) {
  return (
    <ChartContainer config={config} className={className}>
      <RechartsBarChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis 
          dataKey={xAxisDataKey}
          tickFormatter={xAxisFormatter}
        />
        <YAxis />
        {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.fill || `var(--color-${bar.dataKey})`}
            name={bar.name || bar.dataKey}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
}