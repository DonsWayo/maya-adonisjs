"use client"

import * as React from "react"
import { Pie, PieChart as RechartsPieChart, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../chart"
import type { ChartConfig } from "../chart"

interface PieChartProps {
  data: any[]
  dataKey: string
  nameKey?: string
  config: ChartConfig
  height?: number
  colors?: string[]
  showTooltip?: boolean
  labelRenderer?: (entry: any) => string
  outerRadius?: number
  innerRadius?: number
  className?: string
}

const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export function PieChart({
  data,
  dataKey,
  nameKey = "name",
  config,
  height = 300,
  colors = DEFAULT_COLORS,
  showTooltip = true,
  labelRenderer,
  outerRadius = 80,
  innerRadius = 0,
  className
}: PieChartProps) {
  return (
    <ChartContainer config={config} className={className}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={labelRenderer}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey={dataKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}
      </RechartsPieChart>
    </ChartContainer>
  )
}