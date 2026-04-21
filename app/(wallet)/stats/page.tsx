'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { XIcon } from 'lucide-react'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { filterByPeriod, sumByType, groupByCategory, buildChartData, formatCurrency, groupByDate, formatDate } from '@/lib/finance-utils'
import { getCategoryById, type Period } from '@/lib/types'
import { cn } from '@/lib/utils'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week',  label: '週' },
  { value: 'month', label: '月' },
  { value: 'year',  label: '年' },
]

const FALLBACK_COLORS = ['#EF4444','#3B82F6','#8B5CF6','#F59E0B','#10B981','#EC4899','#14B8A6','#6B7280']

function viewEmoji(type: 'debit' | 'credit' | 'easycard'): string {
  if (type === 'credit') return '💳'
  if (type === 'easycard') return '🚌'
  return '🏧'
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const { transactions, isLoaded } = useTransactions()
  const { cards } = useCards()
  const searchParams = useSearchParams()
  const cardIdParam = searchParams.get('cardId')
  const filterParam = searchParams.get('filter')

  const activeCard = cardIdParam ? cards.find(c => c.id === cardIdParam) : undefined

  const periodFiltered = useMemo(() => filterByPeriod(transactions, period), [transactions, period])
  const filtered = useMemo(() => {
    if (cardIdParam) return periodFiltered.filter(tx => tx.cardId === cardIdParam)
    if (filterParam === 'cash') return periodFiltered.filter(tx => !tx.cardId)
    return periodFiltered
  }, [periodFiltered, cardIdParam, filterParam])
  const income      = sumByType(filtered, 'income')
  const expense     = sumByType(filtered, 'expense')
  const balance     = income - expense
  const expenseCats = useMemo(() => groupByCategory(filtered, 'expense'), [filtered])
  const incomeCats  = useMemo(() => groupByCategory(filtered, 'income'),  [filtered])
  const cardFiltered = useMemo(() => {
    if (cardIdParam) return transactions.filter(tx => tx.cardId === cardIdParam)
    if (filterParam === 'cash') return transactions.filter(tx => !tx.cardId)
    return transactions
  }, [transactions, cardIdParam, filterParam])
  const chartData   = useMemo(() => buildChartData(cardFiltered, period), [cardFiltered, period])
  const groups      = useMemo(() => groupByDate(filtered), [filtered])

  const cardStats = useMemo(() => {
    const cashTxs = filtered.filter(tx => !tx.cardId)
    const rows = [
      {
        id: 'cash', name: '現金', emoji: '💵', color: '#10B981',
        expense: sumByType(cashTxs, 'expense'),
        income:  sumByType(cashTxs, 'income'),
      },
      ...cards.map(card => {
        const txs = filtered.filter(tx => tx.cardId === card.id)
        return {
          id: card.id, name: card.name, emoji: viewEmoji(card.type), color: card.color,
          expense: sumByType(txs, 'expense'),
          income:  sumByType(txs, 'income'),
        }
      }),
    ].filter(r => r.expense > 0 || r.income > 0)
    return rows
  }, [filtered, cards])

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
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">收支分析</h1>
          {(cardIdParam || filterParam) && (
            <Link
              href="/stats"
              className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted/80"
            >
              {filterParam === 'cash' ? '現金' : (activeCard?.name ?? '卡片')}
              <XIcon className="size-3" />
            </Link>
          )}
        </div>
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

        {/* Cards overview */}
        {cardStats.length > 0 && (
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-card">
            <p className="mb-3 text-sm font-semibold">各帳戶收支</p>
            <div className="flex flex-col gap-2">
              {cardStats.map(row => {
                const net = row.income - row.expense
                const total = row.income + row.expense
                const expenseRatio = total > 0 ? row.expense / total : 0
                return (
                  <div key={row.id} className="flex items-center gap-3">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: row.color + '33' }}
                    >
                      {row.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">{row.name}</span>
                        <span className={cn('text-xs font-semibold ml-2 shrink-0', net >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                          {net >= 0 ? '+' : ''}{formatCurrency(net)}
                        </span>
                      </div>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${expenseRatio * 100}%`, backgroundColor: row.color }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>支出 {formatCurrency(row.expense)}</span>
                        <span>收入 {formatCurrency(row.income)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
