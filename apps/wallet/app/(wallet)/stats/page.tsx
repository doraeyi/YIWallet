'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarClockIcon, BookOpenIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { filterByPeriod, sumByType, groupByCategory, buildChartData, formatCurrency, groupByDate, formatDate, transactionLabels, paymentLabel } from '@/lib/finance-utils'
import { getCategoryById, type Period } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MonthNav } from '@/components/wallet/month-nav'
import { PageSkeleton } from '@/components/wallet/page-skeleton'
import { useTotalScope } from '@/hooks/use-total-scope'
import { PaymentIcon, type PaymentKind } from '@/components/wallet/payment-icon'
import { CategoryBadge } from '@/components/wallet/category-icon'
import { RecurringExpenses } from '@/components/wallet/recurring-expenses'
import { OtherCategoryBanner } from '@/components/wallet/other-category-cleanup'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week',  label: '週' },
  { value: 'month', label: '月' },
  { value: 'year',  label: '年' },
]

const FALLBACK_COLORS = ['#EF4444','#3B82F6','#8B5CF6','#F59E0B','#10B981','#EC4899','#14B8A6','#6B7280']


function StatsContent() {
  const [period, setPeriod] = useState<Period>('month')
  const { transactions, isLoaded, year, month, prevMonth, nextMonth } = useTransactions()
  const { cards } = useCards()
  // 「全部」照使用者在首頁勾的計入範圍算（預設不含悠遊卡）
  const { filter: scopeFilter } = useTotalScope(cards)
  const searchParams = useSearchParams()
  const cardIdParam = searchParams.get('cardId')
  const filterParam = searchParams.get('filter')

  const activeCard = cardIdParam ? cards.find(c => c.id === cardIdParam) : undefined

  // 「月」的統計以使用者選的月份為準（跟首頁共用），週/年維持以今天為準
  const referenceDate = useMemo(
    () => period === 'month' ? new Date(year, month - 1, 1) : new Date(),
    [period, year, month],
  )

  const periodFiltered = useMemo(() => filterByPeriod(transactions, period, referenceDate), [transactions, period, referenceDate])
  const filtered = useMemo(() => {
    if (cardIdParam) return periodFiltered.filter(tx => tx.cardId === cardIdParam)
    if (filterParam === 'cash') return periodFiltered.filter(tx => !tx.cardId)
    return scopeFilter(periodFiltered)
  }, [periodFiltered, cardIdParam, filterParam, scopeFilter])
  const income      = sumByType(filtered, 'income')
  const expense     = sumByType(filtered, 'expense')
  const balance     = income - expense
  const expenseCats = useMemo(() => groupByCategory(filtered, 'expense'), [filtered])
  const incomeCats  = useMemo(() => groupByCategory(filtered, 'income'),  [filtered])
  const cardFiltered = useMemo(() => {
    if (cardIdParam) return transactions.filter(tx => tx.cardId === cardIdParam)
    if (filterParam === 'cash') return transactions.filter(tx => !tx.cardId)
    return scopeFilter(transactions)
  }, [transactions, cardIdParam, filterParam, scopeFilter])
  const chartData   = useMemo(() => buildChartData(cardFiltered, period, referenceDate), [cardFiltered, period, referenceDate])
  // 點「總收入」或「總支出」只看那一種的明細，再點一次恢復全部
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | null>(null)
  // 趨勢圖預設只看支出：一筆薪水的長條會把每天的小額支出壓到幾乎看不見
  const [trendType, setTrendType] = useState<'expense' | 'income' | 'both'>('expense')
  const listed      = useMemo(() => (typeFilter ? filtered.filter(t => t.type === typeFilter) : filtered), [filtered, typeFilter])
  const groups      = useMemo(() => groupByDate(listed), [listed])
  const toggleType  = (t: 'income' | 'expense') => setTypeFilter(prev => (prev === t ? null : t))

  const cardStats = useMemo(() => {
    const cashTxs = filtered.filter(tx => !tx.cardId)
    const rows = [
      {
        id: 'cash', name: '現金', kind: 'cash' as PaymentKind, color: '#10B981',
        expense: sumByType(cashTxs, 'expense'),
        income:  sumByType(cashTxs, 'income'),
      },
      ...cards.map(card => {
        const txs = filtered.filter(tx => tx.cardId === card.id)
        return {
          id: card.id, name: card.name, kind: card.type as PaymentKind, color: card.color,
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
    return <PageSkeleton />
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-4 lg:px-1 lg:pt-8">
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

      {period === 'month' && (
        <div className="flex justify-center px-5 pb-2">
          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 lg:px-1">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          {([
            { type: 'income', label: '總收入', value: income, color: 'text-emerald-600', ring: 'ring-emerald-500' },
            { type: 'expense', label: '總支出', value: expense, color: 'text-rose-500', ring: 'ring-rose-500' },
          ] as const).map(item => (
            <button
              key={item.type}
              onClick={() => toggleType(item.type)}
              aria-pressed={typeFilter === item.type}
              className={cn(
                'rounded-2xl bg-white p-4 text-left shadow-sm transition-all duration-200 dark:bg-card',
                typeFilter === item.type ? `ring-2 ${item.ring}` : typeFilter && 'opacity-50',
              )}
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn('mt-1 text-lg font-bold', item.color)}>{formatCurrency(item.value)}</p>
            </button>
          ))}
          <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-card">
            <p className="text-xs text-muted-foreground">結餘</p>
            <p className={cn('mt-1 text-lg font-bold', balance >= 0 ? 'text-foreground' : 'text-rose-500')}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* 往現金流、年度回顧 */}
        {!cardIdParam && !filterParam && (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/cashflow" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-muted/40 dark:bg-card">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground"><CalendarClockIcon className="size-4" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">現金流</span>
                <span className="block truncate text-xs text-muted-foreground">發薪、卡費排一起看</span>
              </span>
            </Link>
            <Link href="/recap" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-colors hover:bg-muted/40 dark:bg-card">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground"><BookOpenIcon className="size-4" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">年度回顧</span>
                <span className="block truncate text-xs text-muted-foreground">這一年花在哪裡</span>
              </span>
            </Link>
          </div>
        )}

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
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: row.color + '26', color: row.color }}
                    >
                      <PaymentIcon kind={row.kind} className="size-4" />
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
                      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">收支趨勢</p>
            <div role="tablist" className="flex rounded-full bg-muted p-0.5 text-xs font-medium">
              {([['expense', '支出'], ['income', '收入'], ['both', '一起看']] as const).map(([v, label]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={trendType === v}
                  onClick={() => setTrendType(v)}
                  className={cn(
                    'rounded-full px-3 py-1 transition-colors',
                    trendType === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
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
              {trendType === 'both' && <Legend formatter={v => v === 'income' ? '收入' : '支出'} iconType="circle" iconSize={8} />}
              {trendType !== 'expense' && <Bar dataKey="income" fill="#10B981" radius={[4,4,0,0]} />}
              {trendType !== 'income' && <Bar dataKey="expense" fill="#F43F5E" radius={[4,4,0,0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!cardIdParam && !filterParam && <OtherCategoryBanner />}

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

        {!cardIdParam && !filterParam && <RecurringExpenses />}

        {/* Transaction list for this period */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold">
              本期明細{typeFilter && <span className="font-normal text-muted-foreground">・只看{typeFilter === 'income' ? '收入' : '支出'}</span>}
            </p>
            {typeFilter ? (
              <button onClick={() => setTypeFilter(null)} className="text-xs font-medium text-brand-text hover:underline">顯示全部</button>
            ) : (
              <span className="text-xs text-muted-foreground">點上面的收入或支出可以篩選</span>
            )}
          </div>
          {groups.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl bg-white py-10 shadow-sm dark:bg-card">
              <p className="text-sm text-muted-foreground">
                {typeFilter ? `這段期間沒有${typeFilter === 'income' ? '收入' : '支出'}` : '這段期間還沒有紀錄'}
              </p>
            </div>
          ) : (
            <div key={typeFilter ?? 'all'} className="stagger flex flex-col gap-2">
            {groups.map(({ date, items }) => {
              const dayIncome  = items.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0)
              const dayExpense = items.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)
              return (
                <div key={date} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
                  <div className="flex items-center justify-between border-b px-4 py-2">
                    <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
                    <div className="flex gap-2 text-xs">
                      {dayIncome  > 0 && <span className="text-emerald-600">+{formatCurrency(dayIncome)}</span>}
                      {dayExpense > 0 && <span className="text-muted-foreground">-{formatCurrency(dayExpense)}</span>}
                    </div>
                  </div>
                  {items.map((tx, idx) => {
                    const cat = getCategoryById(tx.category)
                    const { title, subtitle } = transactionLabels(tx, cat?.name ?? tx.category, paymentLabel(tx, cards))
                    return (
                      <div key={tx.id} className={cn('flex items-center gap-3 px-4 py-3', idx > 0 && 'border-t')}>
                        <CategoryBadge id={tx.category} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{title}</p>
                          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                        </div>
                        <p className={cn('shrink-0 text-sm font-semibold tabular-nums', tx.type === 'income' ? 'text-emerald-600' : 'text-foreground')}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            </div>
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
            <p className="text-[10px] text-muted-foreground">{label}</p>
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

export default function StatsPage() {
  return (
    <Suspense>
      <StatsContent />
    </Suspense>
  )
}
