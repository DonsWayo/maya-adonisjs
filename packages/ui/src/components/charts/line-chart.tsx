"use client"

import * as React from "react"
import { Line, LineChart as RechartsLineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "../chart"
import type { ChartConfig } from "../chart"

interface LineChartProps {
  data: any[]
  lines: {
    dataKey: string
    stroke?: string
    yAxisId?: string
    type?: "monotone" | "linear" | "basis" | "basisClosed" | "basisOpen" | "step" | "stepBefore" | "stepAfter" | "natural"
    name?: string
  }[]
  xAxisDataKey: string
  config: ChartConfig
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
  leftYAxis?: boolean
  rightYAxis?: boolean
  xAxisFormatter?: (value: any) => string
  className?: string
}

export function LineChart({
  data,
  lines,
  xAxisDataKey,
  config,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  leftYAxis = true,
  rightYAxis = false,
  xAxisFormatter,
  className
}: LineChartProps) {
  return (
    <ChartContainer config={config} className={className}>
      <RechartsLineChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis 
          dataKey={xAxisDataKey}
          tickFormatter={xAxisFormatter}
        />
        {leftYAxis && <YAxis yAxisId="left" />}
        {rightYAxis && <YAxis yAxisId="right" orientation="right" />}
        {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            yAxisId={line.yAxisId || "left"}
            type={line.type || "monotone"}
            dataKey={line.dataKey}
            stroke={line.stroke || `var(--color-${line.dataKey})`}
            name={line.name || line.dataKey}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  )
}