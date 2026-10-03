'use client'

import { useState, useMemo } from 'react'
import { SearchIcon, PencilIcon, Trash2Icon, ChevronLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { useCards } from '@/hooks/use-cards'
import { useTransactions } from '@/hooks/use-transactions'
import { AddTransactionSheet } from '@/components/wallet/add-transaction-sheet'
import { groupByDate, formatDate, formatCurrency, filterByMonth, sumByType, transactionLabels, paymentLabel } from '@/lib/finance-utils'
import { getCategoryById, type Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { PageSkeleton } from '@/components/wallet/page-skeleton'
import { confirmDialog } from '@/lib/confirm'

export default function TransactionsPage() {
  const { transactions, isLoaded, updateTransaction, deleteTransaction, year, setYear } = useTransactions()
  const now = new Date()
  const [month,  setMonth]  = useState(now.getMonth() + 1)
  const [search, setSearch] = useState('')
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const { cards } = useCards()
  // 付款方式篩選：all / cash / 某張卡的 id
  const [payFilter, setPayFilter] = useState('all')

  const byMonth  = useMemo(() => filterByMonth(transactions, year, month), [transactions, year, month])
  const filtered = useMemo(() => {
    const byPay = payFilter === 'all' ? byMonth
      : payFilter === 'cash' ? byMonth.filter(t => !t.cardId)
      : byMonth.filter(t => t.cardId === payFilter)
    if (!search.trim()) return byPay
    const q = search.toLowerCase()
    return byPay.filter(t => {
      const cat = getCategoryById(t.category)
      return t.note.toLowerCase().includes(q)
        || (t.description ?? '').toLowerCase().includes(q)
        || (cat?.name ?? '').toLowerCase().includes(q)
    })
  }, [byMonth, search, payFilter])
  const isFiltering = !!search.trim() || payFilter !== 'all'

  const groups  = groupByDate(filtered)
  const income  = sumByType(byMonth, 'income')
  const expense = sumByType(byMonth, 'expense')

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  async function handleDelete(tx: Transaction, label: string) {
    if (!(await confirmDialog(`確定刪除「${label}」${formatCurrency(tx.amount)}？\n刪除後無法復原。`, { confirmText: '刪除', danger: true }))) return
    try {
      await deleteTransaction(tx.id)
      toast('已刪除')
    } catch {
      toast('刪除失敗，請再試一次', 'error')
    }
  }

  if (!isLoaded) {
    return <PageSkeleton />
  }

  return (
    <>
      {editTx && (
        <AddTransactionSheet
          open={!!editTx}
          onOpenChange={open => { if (!open) setEditTx(null) }}
          onSubmit={data => updateTransaction(editTx.id, data)}
          onDelete={() => deleteTransaction(editTx.id)}
          initialData={editTx}
        />
      )}

      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-10 pb-4 lg:pt-8">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" aria-label="回首頁" className="-ml-2 flex size-8 items-center justify-center rounded-full hover:bg-muted">
              <ChevronLeftIcon className="size-5" />
            </Link>
            <h1 className="text-xl font-bold">收支明細</h1>
            <div className="flex items-center gap-0.5 text-sm font-medium text-muted-foreground">
              <button onClick={prevMonth} className="px-1 hover:text-foreground">‹</button>
              <span>{year}/{String(month).padStart(2,'0')}</span>
              <button onClick={nextMonth} className="px-1 hover:text-foreground">›</button>
            </div>
          </div>

          {/* Month summary — desktop only */}
          <div className="hidden items-center gap-4 text-sm lg:flex">
            <span className="text-muted-foreground">收入 <span className="font-semibold text-emerald-600">{formatCurrency(income)}</span></span>
            <span className="text-muted-foreground">支出 <span className="font-semibold text-rose-500">{formatCurrency(expense)}</span></span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mx-4 mb-4 lg:mx-6 lg:max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="搜尋商家、備註或分類"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring dark:bg-card"
          />
        </div>

        {/* 付款方式篩選 */}
        {cards.length > 0 && (
          <div className="mx-4 mb-3 flex gap-1.5 overflow-x-auto scrollbar-none lg:mx-6">
            {[{ id: 'all', name: '全部' }, { id: 'cash', name: '💵 現金' }, ...cards.map(c => ({ id: c.id, name: c.name }))].map(o => (
              <button
                key={o.id}
                onClick={() => setPayFilter(o.id)}
                aria-pressed={payFilter === o.id}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  payFilter === o.id ? 'bg-foreground text-background' : 'bg-white text-muted-foreground shadow-sm dark:bg-card',
                )}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}

        {/* 篩選後的合計 */}
        {isFiltering && filtered.length > 0 && (
          <p className="mx-4 mb-3 text-xs text-muted-foreground lg:mx-6">
            符合 {filtered.length} 筆
            {sumByType(filtered, 'expense') > 0 && <>・支出 <span className="font-semibold text-rose-500">{formatCurrency(sumByType(filtered, 'expense'))}</span></>}
            {sumByType(filtered, 'income') > 0 && <>・收入 <span className="font-semibold text-emerald-600">{formatCurrency(sumByType(filtered, 'income'))}</span></>}
          </p>
        )}

        {/* List */}
        <div className="flex flex-col gap-3 px-4 lg:px-6">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm dark:bg-card">
              <p className="text-3xl">📒</p>
              <p className="mt-2 text-sm text-muted-foreground">{isFiltering ? '沒有符合的紀錄' : '這個月還沒有紀錄'}</p>
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-2 lg:gap-3 flex flex-col gap-3">
              {groups.map(({ date, items }) => {
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
                      const { title, subtitle } = transactionLabels(tx, cat?.name ?? tx.category, paymentLabel(tx, cards))
                      return (
                        <div key={tx.id} className={cn('flex items-center gap-3 px-4 py-3', idx > 0 && 'border-t')}>
                          <span
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
                            style={{ backgroundColor: cat?.color }}
                          >
                            {cat?.emoji ?? '💸'}
                          </span>
                          <button onClick={() => setEditTx(tx)} className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-medium">{title}</p>
                            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
                          </button>
                          <p className={cn('shrink-0 text-sm font-semibold', tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500')}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          <div className="flex shrink-0 gap-1">
                            <button onClick={() => setEditTx(tx)} aria-label={`編輯「${title}」`} className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                              <PencilIcon className="size-3.5" />
                            </button>
                            <button onClick={() => handleDelete(tx, title)} aria-label={`刪除「${title}」`} className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-100 hover:text-rose-500">
                              <Trash2Icon className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="h-6" />
      </div>
    </>
  )
}
