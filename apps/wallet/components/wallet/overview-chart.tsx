'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildChartData } from '@/lib/finance-utils'
import type { Transaction, Period } from '@/lib/types'

interface OverviewChartProps {
  transactions: Transaction[]
  period: Period
}

export function OverviewChart({ transactions, period }: OverviewChartProps) {
  const data = buildChartData(transactions, period)

  const periodLabel: Record<Period, string> = {
    week:  '本週每日',
    month: '本月每日',
    year:  '本年每月',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>收支概覽 · {periodLabel[period]}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              width={36}
            />
            <Tooltip
              formatter={(value, name) => [
                new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(Number(value)),
                name === 'income' ? '收入' : '支出',
              ]}
              contentStyle={{ borderRadius: '8px', fontSize: 13 }}
            />
            <Legend
              formatter={v => v === 'income' ? '收入' : '支出'}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="income"  fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
