'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { BellIcon, CalendarIcon, ChevronRightIcon, PlusIcon, Trash2Icon, StarIcon, XIcon } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { filterByMonth, sumByType, groupByDate, formatCurrency } from '@/lib/finance-utils'
import { getCategoryById, type Card } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AddCardSheet } from '@/components/wallet/add-card-sheet'

type ViewItem =
  | { kind: 'all' }
  | { kind: 'cash' }
  | { kind: 'card'; card: Card }

function getMonthRange(year: number, month: number) {
  const m = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return {
    startDate: `${year}-${m}-01`,
    endDate: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

function viewLabel(item: ViewItem): string {
  if (item.kind === 'all') return '全部'
  if (item.kind === 'cash') return '現金'
  if (item.card.type === 'easycard' && /^\d+$/.test(item.card.name)) return '悠遊卡'
  return item.card.name
}

// 取末四碼：優先 lastFour，其次從全數字卡名取末四
function cardLastFour(card: Card): string | undefined {
  if (card.lastFour) return card.lastFour
  if (/^\d{4,}$/.test(card.name)) return card.name.slice(-4)
  return undefined
}

function viewColor(item: ViewItem): string {
  if (item.kind === 'card') return item.card.color
  if (item.kind === 'cash') return '#10B981'
  return '#FBBF24'
}

function viewEmoji(item: ViewItem): string {
  if (item.kind === 'card') {
    if (item.card.type === 'credit') return '💳'
    if (item.card.type === 'easycard') return '🚌'
    return '🏧'
  }
  if (item.kind === 'cash') return '💵'
  return '🏦'
}

// ── SVG Donut ──────────────────────────────────────────────────────────────
function DonutChart({
  expense,
  income,
  balance,
  ringColor,
  centerLabel,
  centerValue,
}: {
  expense: number
  income: number
  balance: number
  ringColor: string
  centerLabel?: string
  centerValue?: number
}) {
  const r = 76
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const ratio = income > 0 ? Math.min(expense / income, 1) : expense > 0 ? 1 : 0
  const filled = ratio * circumference
  const displayValue = centerValue ?? balance
  const displayLabel = centerLabel ?? '月結餘'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={28} />
        {filled > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={28}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap={ratio < 1 ? 'round' : 'butt'}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center px-4 text-center">
        <span className="text-xs text-muted-foreground">{displayLabel}</span>
        <span
          className={cn(
            'text-[22px] font-bold leading-tight',
            displayValue >= 0 ? 'text-foreground' : 'text-rose-500',
          )}
        >
          {formatCurrency(displayValue)}
        </span>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { transactions, isLoaded, year, setYear, refetch } = useTransactions()
  const { cards, removeCard, defaultCard, setDefaultCard, updateCard } = useCards()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [viewIndex, setViewIndex] = useState(0)
  const [addCardOpen, setAddCardOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null)
  const [showPassInfo, setShowPassInfo] = useState(false)
  const [renewingPass, setRenewingPass] = useState(false)
  const [bulkAssigning, setBulkAssigning] = useState(false)

  useEffect(() => { setShowPassInfo(false) }, [viewIndex])

  // Touch swipe state
  const touchStartX = useRef<number | null>(null)

  // Build view items: 全部 | 現金 | ...each card
  const viewItems = useMemo<ViewItem[]>(
    () => [{ kind: 'all' }, { kind: 'cash' }, ...cards.map(card => ({ kind: 'card' as const, card }))],
    [cards],
  )
  const total = viewItems.length
  const safeIndex = viewIndex >= total ? 0 : viewIndex
  const currentView = viewItems[safeIndex]

  const allFiltered = useMemo(
    () => filterByMonth(transactions, year, month),
    [transactions, year, month],
  )

  const filtered = useMemo(() => {
    if (currentView.kind === 'all') return allFiltered
    if (currentView.kind === 'cash') return allFiltered.filter(tx => !tx.cardId)
    return allFiltered.filter(tx => tx.cardId === currentView.card.id)
  }, [allFiltered, currentView])

  const income = sumByType(filtered, 'income')
  const expense = sumByType(filtered, 'expense')
  const balance = income - expense

  // Donut center: debit/easycard → 餘額（stored）, credit → 月帳單, others → 月結餘
  const centerLabel = currentView.kind === 'card'
    ? currentView.card.type === 'credit' ? '月帳單'
    : currentView.card.balance != null ? '餘額'
    : '月結餘'
    : '月結餘'
  const centerValue = currentView.kind === 'card'
    ? currentView.card.type === 'credit' ? expense
    : currentView.card.balance ?? balance
    : balance
  const recentGroups = groupByDate(filtered)
  const { startDate, endDate } = getMonthRange(year, month)
  const ringColor = viewColor(currentView)
  const statsHref = currentView.kind === 'card'
    ? `/stats?cardId=${currentView.card.id}`
    : currentView.kind === 'cash'
    ? '/stats?filter=cash'
    : '/stats'

  // 未分類交易（未指定卡片）數量
  const unassignedCount = useMemo(
    () => allFiltered.filter(tx => !tx.cardId).length,
    [allFiltered],
  )

  // 批量套用常用卡
  const handleBulkAssign = useCallback(async () => {
    if (!defaultCard || bulkAssigning) return
    setBulkAssigning(true)
    try {
      const { setTransactionCard } = await import('@/lib/api')
      const unassigned = allFiltered.filter(tx => !tx.cardId)
      await Promise.all(unassigned.map(tx => setTransactionCard(tx.id, defaultCard.id)))
      await refetch()
    } finally {
      setBulkAssigning(false)
    }
  }, [defaultCard, allFiltered, bulkAssigning, refetch])

  const handleRenewPass = useCallback(async () => {
    if (currentView.kind !== 'card' || renewingPass) return
    const card = currentView.card
    setRenewingPass(true)
    try {
      const base = card.passExpiryDate ? new Date(card.passExpiryDate) : new Date()
      base.setMonth(base.getMonth() + 1)
      const newExpiry = base.toISOString().slice(0, 10)
      await updateCard(card.id, { ...card, passExpiryDate: newExpiry })
      setShowPassInfo(false)
    } finally {
      setRenewingPass(false)
    }
  }, [currentView, renewingPass, updateCard])

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function goNext() {
    setViewIndex(i => (i + 1) % total)
  }
  function goPrev() {
    setViewIndex(i => (i - 1 + total) % total)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 48) {
      delta > 0 ? goNext() : goPrev()
    }
    touchStartX.current = null
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        載入中…
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 lg:pt-8">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-400 px-4 py-1 text-sm font-semibold text-white">
            月
          </span>
          <div className="flex items-center gap-0.5">
            <button onClick={prevMonth} className="px-1.5 py-1 text-lg text-muted-foreground hover:text-foreground">
              ‹
            </button>
            <span className="text-base font-semibold">
              {year}年{String(month).padStart(2, '0')}月
            </span>
            <button onClick={nextMonth} className="px-1.5 py-1 text-lg text-muted-foreground hover:text-foreground">
              ›
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <button className="hover:text-foreground">
            <BellIcon className="size-5" />
          </button>
          <Link href="/schedule" className="hover:text-foreground">
            <CalendarIcon className="size-5" />
          </Link>
        </div>
      </div>

      {/* ── Desktop: tab selector ──────────────────────────── */}
      <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto px-6 pb-4 scrollbar-none">
        {viewItems.map((item, i) => (
          <button
            key={i}
            onClick={() => setViewIndex(i)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors shrink-0',
              i === safeIndex
                ? 'text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
            style={i === safeIndex ? { backgroundColor: viewColor(item) } : undefined}
          >
            <span>{viewEmoji(item)}</span>
            {viewLabel(item)}
            {item.kind === 'card' && cardLastFour(item.card) && (
              <span className="opacity-70">···· {cardLastFour(item.card)}</span>
            )}
            {item.kind === 'card' && item.card.id === defaultCard?.id && (
              <StarIcon className="size-3 fill-current opacity-80" />
            )}
          </button>
        ))}
        <button
          onClick={() => setAddCardOpen(true)}
          className="flex shrink-0 items-center gap-1 rounded-full border-2 border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-amber-400 hover:text-amber-500 transition-colors"
        >
          <PlusIcon className="size-3.5" />
          新增卡片
        </button>
      </div>

      {/* ── Stats bar ──────────────────────────────────────── */}
      <div className="flex items-start justify-between px-6 pb-2">
        <Link href={statsHref} className="flex flex-col">
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            月支出
            <ChevronRightIcon className="size-3" />
          </span>
          <span className="text-2xl font-bold text-rose-500">{formatCurrency(expense)}</span>
        </Link>
        <Link href={statsHref} className="flex flex-col items-end">
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            月收入
            <ChevronRightIcon className="size-3" />
          </span>
          <span className="text-2xl font-bold text-emerald-600">{formatCurrency(income)}</span>
        </Link>
      </div>

      {/* ── Mobile: swipeable donut ────────────────────────── */}
      <div
        className="relative flex justify-center py-6 lg:py-4 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Link href={statsHref}>
          <DonutChart
            expense={expense}
            income={income}
            balance={balance}
            ringColor={ringColor}
            centerLabel={centerLabel}
            centerValue={centerValue}
          />
        </Link>
        {/* 月票鈴鐺 */}
        {currentView.kind === 'card' && currentView.card.type === 'easycard' && currentView.card.passExpiryDate && (
          <button
            onClick={() => setShowPassInfo(v => !v)}
            className="absolute right-8 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <BellIcon className="size-4" />
          </button>
        )}
      </div>

      {/* 月票資訊 popover */}
      {showPassInfo && currentView.kind === 'card' && currentView.card.passExpiryDate && (() => {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const expiry = new Date(currentView.card.passExpiryDate)
        const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86400000)
        return (
          <div className="mx-4 -mt-2 mb-3 flex items-center justify-between rounded-xl border px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">月票到期日</span>
              <span className={cn('text-sm font-semibold', daysLeft <= 7 ? 'text-rose-500' : 'text-foreground')}>
                {currentView.card.passExpiryDate}
                <span className="ml-1.5 text-xs font-normal">
                  {daysLeft >= 0 ? `（${daysLeft} 天後）` : '（已到期）'}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRenewPass}
                disabled={renewingPass}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                {renewingPass ? '更新中…' : '已續'}
              </button>
              <button onClick={() => setShowPassInfo(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
          </div>
        )
      })()}

      {/* Current view label + 設為常用 */}
      <div className="flex items-center justify-center gap-2 -mt-3 mb-2">
        <p className="text-xs font-medium text-muted-foreground">
          {viewEmoji(currentView)}{' '}
          {viewLabel(currentView)}
          {currentView.kind === 'card' && cardLastFour(currentView.card)
            ? ` ···· ${cardLastFour(currentView.card)}`
            : ''}
        </p>
        {currentView.kind === 'card' && (
          <button
            onClick={() => setDefaultCard(
              defaultCard?.id === currentView.card.id ? null : currentView.card.id
            )}
            className={cn(
              'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] transition-colors',
              defaultCard?.id === currentView.card.id
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            <StarIcon className={cn('size-2.5', defaultCard?.id === currentView.card.id && 'fill-current')} />
            {defaultCard?.id === currentView.card.id ? '常用' : '設為常用'}
          </button>
        )}
      </div>


      {/* ── Mobile: pagination dots ────────────────────────── */}
      <div className="flex justify-center gap-1.5 pb-3 lg:hidden">
        {viewItems.map((item, i) => (
          <button
            key={i}
            onClick={() => setViewIndex(i)}
            className={cn(
              'rounded-full transition-all duration-200',
              i === safeIndex ? 'size-2.5' : 'size-2 bg-muted-foreground/25',
            )}
            style={i === safeIndex ? { backgroundColor: viewColor(item) } : undefined}
          />
        ))}
      </div>

      {/* ── Action row ─────────────────────────────────────── */}
      <div className="flex items-center px-6 pb-4 lg:hidden">
        <button
          onClick={() => setAddCardOpen(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <PlusIcon className="size-3.5" />
          新增卡片
        </button>
      </div>

      {/* ── 套用常用卡 banner ──────────────────────────────── */}
      {defaultCard && unassignedCount > 0 && (
        <div className="mx-4 mb-3 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 dark:bg-amber-900/20">
          <span className="text-xs text-amber-700 dark:text-amber-300">
            有 {unassignedCount} 筆未分類，套用到{' '}
            <span className="font-semibold">{defaultCard.name}</span>？
          </span>
          <button
            onClick={handleBulkAssign}
            disabled={bulkAssigning}
            className="shrink-0 rounded-lg bg-amber-400 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
          >
            {bulkAssigning ? '套用中…' : '套用'}
          </button>
        </div>
      )}

      {/* ── Delete card confirmation ───────────────────────── */}
      {deleteTarget && (
        <div className="mx-4 mb-3 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-2.5 dark:bg-rose-900/20">
          <span className="text-sm text-rose-700 dark:text-rose-300">
            刪除「{deleteTarget.name}」？
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={() => {
                removeCard(deleteTarget.id)
                setDeleteTarget(null)
                setViewIndex(0)
              }}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              <Trash2Icon className="size-3" />
              刪除
            </button>
          </div>
        </div>
      )}

      {/* ── Recent records ─────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold">最近紀錄</span>
          <Link href="/transactions" className="text-xs text-primary hover:underline">
            查看全部
          </Link>
        </div>

        {recentGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 shadow-sm dark:bg-card">
            <p className="text-3xl">📒</p>
            <p className="mt-2 text-sm text-muted-foreground">這個月還沒有紀錄</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card lg:grid lg:grid-cols-2 lg:items-start">
            {recentGroups.map(({ date, items }, groupIdx) => {
              const d = parseISO(date)
              const dateLabel = format(d, 'yyyy/MM/dd EEEE', { locale: zhTW })
              const dayExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
              const dayIncome = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
              const dayNet = dayIncome - dayExpense

              return (
                <div key={date} className={cn(groupIdx > 0 && 'border-t lg:border-t-0')}>
                  <div className="flex items-center justify-between bg-muted/20 px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground">{dateLabel}</span>
                    <span className={cn('text-xs font-semibold', dayNet >= 0 ? 'text-emerald-600' : 'text-amber-500')}>
                      {dayNet >= 0 ? '+' : ''}{formatCurrency(dayNet)}
                    </span>
                  </div>
                  {items.map((tx, idx) => {
                    const cat = getCategoryById(tx.category)
                    return (
                      <div
                        key={tx.id}
                        className={cn('flex items-center gap-3 px-4 py-3', idx > 0 && 'border-t')}
                      >
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
                          style={{ backgroundColor: cat?.color }}
                        >
                          {cat?.emoji ?? '💸'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{cat?.name ?? tx.category}</p>
                          {tx.note && (
                            <p className="truncate text-xs text-muted-foreground">{tx.note}</p>
                          )}
                        </div>
                        <span className={cn('shrink-0 text-sm font-semibold', tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500')}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
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

      {/* ── Sheets ─────────────────────────────────────────── */}
      <AddCardSheet open={addCardOpen} onOpenChange={setAddCardOpen} />
    </div>
  )
}
