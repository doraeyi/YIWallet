'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useTransactions } from '@/hooks/use-transactions'
import { filterByPeriod, sumByType, groupByCategory, buildChartData, formatCurrency, groupByDate, formatDate } from '@/lib/finance-utils'
import { getCategoryById, type Period } from '@/lib/types'
import { cn } from '@/lib/utils'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week',  label: '週' },
  { value: 'month', label: '月' },
  { value: 'year',  label: '年' },
]

const FALLBACK_COLORS = ['#EF4444','#3B82F6','#8B5CF6','#F59E0B','#10B981','#EC4899','#14B8A6','#6B7280']

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const { transactions, isLoaded } = useTransactions()

  const filtered    = useMemo(() => filterByPeriod(transactions, period), [transactions, period])
  const income      = sumByType(filtered, 'income')
  const expense     = sumByType(filtered, 'expense')
  const balance     = income - expense
  const expenseCats = useMemo(() => groupByCategory(filtered, 'expense'), [filtered])
  const incomeCats  = useMemo(() => groupByCategory(filtered, 'income'),  [filtered])
  const chartData   = useMemo(() => buildChartData(transactions, period), [transactions, period])
  const groups      = useMemo(() => groupByDate(filtered), [filtered])

  const expensePieData = expenseCats.map(d => ({
    name:  getCategoryById(d.category)?.name ?? d.category,
    value: d.amount,
    color: getCategoryById(d.category)?.color,
  }))
  const incomePieData = incomeCats.map(d => ({
    name:  getCategoryById(d.category)?.name ?? d.category,
    value: d.amount,
    color: getCategoryById(d.category)?.color,
  }))

  if (!isLoaded) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 lg:pt-8">
        <h1 className="text-xl font-bold">收支分析</h1>
        {/* Period tabs */}
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                period === p.value
                  ? 'bg-foreground text-background'
                  : 'bg-white text-muted-foreground shadow-sm dark:bg-card hover:bg-muted'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 lg:px-6">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-card">
            <p className="text-xs text-muted-foreground">總收入</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(income)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-card">
            <p className="text-xs text-muted-foreground">總支出</p>
            <p className="mt-1 text-lg font-bold text-rose-500">{formatCurrency(expense)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-card">
            <p className="text-xs text-muted-foreground">結餘</p>
            <p className={cn('mt-1 text-lg font-bold', balance >= 0 ? 'text-foreground' : 'text-rose-500')}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* Bar chart — full width */}
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-card">
          <p className="mb-4 text-sm font-semibold">收支趨勢</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={4} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(Number(value)),
                  name === 'income' ? '收入' : '支出',
                ]}
                contentStyle={{ borderRadius: 10, fontSize: 12 }}
              />
              <Legend formatter={v => v === 'income' ? '收入' : '支出'} iconType="circle" iconSize={8} />
              <Bar dataKey="income"  fill="#10B981" radius={[4,4,0,0]} />
              <Bar dataKey="expense" fill="#EF4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie charts — side by side on desktop */}
        <div className="grid gap-4 lg:grid-cols-2">
          <CategorySection
            title="支出分佈"
            total={expense}
            pieData={expensePieData}
            categories={expenseCats}
            totalColor="#EF4444"
            label="總支出"
          />
          <CategorySection
            title="收入分佈"
            total={income}
            pieData={incomePieData}
            categories={incomeCats}
            totalColor="#10B981"
            label="總收入"
          />
        </div>

        {/* Transaction list for this period */}
        <div className="flex flex-col gap-2">
          <p className="px-1 text-sm font-semibold">本期明細</p>
          {groups.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl bg-white py-10 shadow-sm dark:bg-card">
              <p className="text-sm text-muted-foreground">此期間暫無紀錄</p>
            </div>
          ) : (
            groups.map(({ date, items }) => {
              const dayIncome  = items.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0)
              const dayExpense = items.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)
              return (
                <div key={date} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
                  <div className="flex items-center justify-between border-b px-4 py-2">
                    <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
                    <div className="flex gap-2 text-xs">
                      {dayIncome  > 0 && <span className="text-emerald-600">+{formatCurrency(dayIncome)}</span>}
                      {dayExpense > 0 && <span className="text-rose-500">-{formatCurrency(dayExpense)}</span>}
                    </div>
                  </div>
                  {items.map((tx, idx) => {
                    const cat = getCategoryById(tx.category)
                    return (
                      <div key={tx.id} className={cn('flex items-center gap-3 px-4 py-3', idx > 0 && 'border-t')}>
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
                          style={{ backgroundColor: cat?.color }}
                        >
                          {cat?.emoji ?? '💸'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{cat?.name ?? tx.category}</p>
                          {tx.note && <p className="truncate text-xs text-muted-foreground">{tx.note}</p>}
                        </div>
                        <p className={cn('shrink-0 text-sm font-semibold', tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500')}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="h-6" />
    </div>
  )
}

interface PieEntry { name: string; value: number; color?: string }
interface CatEntry  { category: string; amount: number; percent: number }

function CategorySection({
  title, total, pieData, categories, totalColor, label,
}: {
  title: string
  total: number
  pieData: PieEntry[]
  categories: CatEntry[]
  totalColor: string
  label: string
}) {
  if (pieData.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-white p-8 shadow-sm dark:bg-card">
        <p className="text-sm text-muted-foreground">{title}：暫無資料</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-card">
      <p className="mb-4 text-sm font-semibold">{title}</p>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative shrink-0">
          <ResponsiveContainer width={130} height={130}>
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%"
                innerRadius={38} outerRadius={60}
                paddingAngle={2} dataKey="value"
                startAngle={90} endAngle={-270}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[9px] text-muted-foreground">{label}</p>
            <p className="text-xs font-bold leading-tight" style={{ color: totalColor }}>
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-1 flex-col gap-2">
          {categories.map((cat, idx) => {
            const info = getCategoryById(cat.category)
            const color = info?.color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
            return (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate text-xs">{info?.name ?? cat.category}</span>
                </div>
                <div className="ml-2 shrink-0 text-right">
                  <span className="text-xs font-medium">{formatCurrency(cat.amount)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{cat.percent}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
