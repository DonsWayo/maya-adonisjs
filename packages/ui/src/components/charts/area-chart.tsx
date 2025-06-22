"use client"

import * as React from "react"
import { Area, AreaChart as RechartsAreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "../chart"
import type { ChartConfig } from "../chart"

interface AreaChartProps {
  data: any[]
  areas: {
    dataKey: string
    fill?: string
    stroke?: string
    stackId?: string
    type?: "monotone" | "linear" | "basis" | "basisClosed" | "basisOpen" | "step" | "stepBefore" | "stepAfter" | "natural"
    name?: string
    fillGradientId?: string
  }[]
  xAxisDataKey: string
  config: ChartConfig
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  xAxisFormatter?: (value: any) => string
  gradients?: {
    id: string
    color: string
    startOpacity?: number
    endOpacity?: number
  }[]
  className?: string
}

export function AreaChart({
  data,
  areas,
  xAxisDataKey,
  config,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  xAxisFormatter,
  gradients = [],
  className
}: AreaChartProps) {
  return (
    <ChartContainer config={config} className={className}>
      <RechartsAreaChart data={data}>
        {gradients.length > 0 && (
          <defs>
            {gradients.map((gradient) => (
              <linearGradient key={gradient.id} id={gradient.id} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={gradient.color}
                  stopOpacity={gradient.startOpacity || 0.8}
                />
                <stop
                  offset="95%"
                  stopColor={gradient.color}
                  stopOpacity={gradient.endOpacity || 0.1}
                />
              </linearGradient>
            ))}
          </defs>
        )}
        {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
        <XAxis 
          dataKey={xAxisDataKey}
          tickFormatter={xAxisFormatter}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis />
        {showTooltip && (
          <ChartTooltip 
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />} 
          />
        )}
        {areas.map((area, index) => (
          <Area
            key={area.dataKey}
            type={area.type || "natural"}
            dataKey={area.dataKey}
            stroke={area.stroke || `var(--color-${area.dataKey})`}
            fill={area.fillGradientId ? `url(#${area.fillGradientId})` : (area.fill || `var(--color-${area.dataKey})`)}
            stackId={area.stackId}
            name={area.name || area.dataKey}
          />
        ))}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
      </RechartsAreaChart>
    </ChartContainer>
  )
}