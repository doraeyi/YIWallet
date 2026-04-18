'use client'

import { useState, useMemo } from 'react'
import { SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import { useTransactions } from '@/hooks/use-transactions'
import { filterByMonth, sumByType, groupByDate, formatCurrency, formatDate } from '@/lib/finance-utils'
import { getCategoryById } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { transactions, budget, isLoaded, year, setYear } = useTransactions()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)

  const filtered       = useMemo(() => filterByMonth(transactions, year, month), [transactions, year, month])
  const income         = sumByType(filtered, 'income')
  const expense        = sumByType(filtered, 'expense')
  const totalIncome    = sumByType(transactions, 'income')
  const totalExpense   = sumByType(transactions, 'expense')
  const balance        = totalIncome - totalExpense
  const budgetUsed   = budget > 0 ? Math.min(expense / budget, 1) : 0
  const budgetRemain = budget - expense
  const recentGroups = groupByDate(filtered).slice(0, 5)

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const hour = now.getHours()
  const greeting = hour < 12 ? '早安 ☀️' : hour < 18 ? '午安 🌤️' : '晚安 🌙'

  if (!isLoaded) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 lg:pt-8">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{greeting}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{year} / {String(month).padStart(2, '0')}</span>
            <div className="flex gap-0.5 text-muted-foreground">
              <button onClick={prevMonth} className="px-1 hover:text-foreground">‹</button>
              <button onClick={nextMonth} className="px-1 hover:text-foreground">›</button>
            </div>
          </div>
        </div>
        <Link href="/settings" className="lg:hidden">
          <SettingsIcon className="size-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Desktop: 2-col top section | Mobile: stacked */}
      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">

        {/* Balance card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-card lg:col-span-1">
          <p className="mb-1 text-center text-xs text-muted-foreground">累積結餘</p>
          <p className={cn(
            'text-center text-4xl font-bold',
            balance >= 0 ? 'text-foreground' : 'text-rose-500'
          )}>
            {formatCurrency(balance)}
          </p>
          <div className="mt-4 flex justify-around border-t pt-4">
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-xs text-muted-foreground">總收入</p>
              <p className="text-base font-semibold text-emerald-600">{formatCurrency(income)}</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-xs text-muted-foreground">總支出</p>
              <p className="text-base font-semibold text-rose-500">{formatCurrency(expense)}</p>
            </div>
          </div>
        </div>

        {/* Budget card */}
        {budget > 0 ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-card lg:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">本月預算</span>
              <Link href="/settings" className="text-xs text-primary hover:underline">編輯</Link>
            </div>
            <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  budgetUsed >= 0.9 ? 'bg-rose-500' : budgetUsed >= 0.7 ? 'bg-amber-400' : 'bg-emerald-500'
                )}
                style={{ width: `${budgetUsed * 100}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-muted-foreground">剩餘預算</p>
                <p className={cn('text-2xl font-bold', budgetRemain < 0 ? 'text-rose-500' : 'text-foreground')}>
                  {formatCurrency(Math.abs(budgetRemain))}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(expense)} / {formatCurrency(budget)}
              </p>
            </div>
          </div>
        ) : (
          <div className="hidden rounded-2xl border-2 border-dashed bg-white/50 p-5 dark:bg-card/50 lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-2">
            <p className="text-sm text-muted-foreground">尚未設定預算</p>
            <Link href="/settings" className="text-sm font-medium text-primary hover:underline">前往設定</Link>
          </div>
        )}

        {/* Quick stats — desktop only */}
        <div className="hidden lg:flex lg:flex-col lg:gap-3">
          <div className="flex flex-1 flex-col justify-center rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <p className="text-xs text-muted-foreground">本月收入筆數</p>
            <p className="text-2xl font-bold text-emerald-600">
              {filtered.filter(t => t.type === 'income').length}
              <span className="ml-1 text-sm font-normal">筆</span>
            </p>
          </div>
          <div className="flex flex-1 flex-col justify-center rounded-2xl bg-rose-50 p-4 dark:bg-rose-900/20">
            <p className="text-xs text-muted-foreground">本月支出筆數</p>
            <p className="text-2xl font-bold text-rose-500">
              {filtered.filter(t => t.type === 'expense').length}
              <span className="ml-1 text-sm font-normal">筆</span>
            </p>
          </div>
        </div>
      </div>

      {/* Recent records */}
      <div className="mt-4 px-4 lg:px-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold">最近紀錄</span>
          <Link href="/transactions" className="text-xs text-primary hover:underline">查看全部</Link>
        </div>

        {recentGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 shadow-sm dark:bg-card">
            <p className="text-3xl">📒</p>
            <p className="mt-2 text-sm text-muted-foreground">這個月還沒有紀錄</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {recentGroups.map(({ date, items }) => (
              <div key={date} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
                </div>
                {items.slice(0, 3).map((tx, idx) => {
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
                      <div className="text-right shrink-0">
                        <p className={cn('text-sm font-semibold', tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500')}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{tx.date.slice(5)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-6" />
    </div>
  )
}
