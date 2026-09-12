'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { groupByCategory } from '@/lib/finance-utils'
import { getCategoryById } from '@/lib/types'
import type { Transaction } from '@/lib/types'

const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  '#a78bfa',
  '#34d399',
  '#fb923c',
]

interface CategoryChartProps {
  transactions: Transaction[]
  type: 'income' | 'expense'
}

export function CategoryChart({ transactions, type }: CategoryChartProps) {
  const data = groupByCategory(transactions, type)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{type === 'income' ? '收入' : '支出'}分類</CardTitle>
        </CardHeader>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          暫無資料
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(d => ({
    name: getCategoryById(d.category)?.name ?? d.category,
    value: d.amount,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === 'income' ? '收入' : '支出'}分類</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(Number(value)),
                name,
              ]}
              contentStyle={{ borderRadius: '8px', fontSize: 13 }}
            />
            <Legend iconType="circle" iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
