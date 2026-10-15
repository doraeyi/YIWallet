'use client'

import { merchantKey } from '@/lib/guess-category'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, Share2Icon } from 'lucide-react'
import * as api from '@/lib/api'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { formatCurrency, shiftHours } from '@/lib/finance-utils'
import { getCategoryById, type Job, type Shift } from '@/lib/types'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { PageSkeleton } from '@/components/wallet/page-skeleton'
import { CategoryBadge } from '@/components/wallet/category-icon'

// 年度回顧：一年記下來的帳，整理成幾張可以分享的卡片。全部從已經載入的交易跟班表現算。
export default function RecapPage() {
  const { transactions, isLoaded } = useTransactions()
  const { cards } = useCards()
  const [work, setWork] = useState<{ jobs: Job[]; shifts: Shift[] } | null>(null)

  useEffect(() => {
    Promise.all([api.fetchJobs().catch(() => [] as Job[]), api.fetchShifts().catch(() => [] as Shift[])])
      .then(([jobs, shifts]) => setWork({ jobs, shifts }))
  }, [])

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => Number(t.date.slice(0, 4))))
    return [...set].filter(Boolean).sort((a, b) => b - a)
  }, [transactions])
  // 一月時預設看去年（剛過完的那一年）
  const defaultYear = new Date().getMonth() === 0 && years.includes(new Date().getFullYear() - 1)
    ? new Date().getFullYear() - 1 : new Date().getFullYear()
  const [picked, setPicked] = useState<number | null>(null)
  const year = picked ?? defaultYear

  const recap = useMemo(() => {
    const txs = transactions.filter(t => t.date.startsWith(String(year)))
    const expenses = txs.filter(t => t.type === 'expense' && t.category !== 'transfer')
    const spent = expenses.reduce((s, t) => s + t.amount, 0)
    const earned = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)

    const byCat = new Map<string, number>()
    for (const t of expenses) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
    const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

    const byShop = new Map<string, { count: number; total: number }>()
    for (const t of expenses) {
      // 分店、不同寫法算同一家（統一超商-八里、7-Eleven 都是 7-ELEVEN）
      const name = t.description?.trim() ? merchantKey(t.description) : ''
      if (!name) continue
      const cur = byShop.get(name) ?? { count: 0, total: 0 }
      byShop.set(name, { count: cur.count + 1, total: cur.total + t.amount })
    }
    const topShop = [...byShop.entries()].sort((a, b) => b[1].count - a[1].count)[0]

    const byMonth = new Array(12).fill(0) as number[]
    for (const t of expenses) byMonth[Number(t.date.slice(5, 7)) - 1] += t.amount
    const maxMonth = byMonth.indexOf(Math.max(...byMonth))

    const biggest = expenses.reduce<typeof expenses[number] | null>((m, t) => (!m || t.amount > m.amount ? t : m), null)

    const byCard = new Map<string, number>()
    for (const t of expenses) if (t.cardId) byCard.set(t.cardId, (byCard.get(t.cardId) ?? 0) + 1)
    const topCardEntry = [...byCard.entries()].sort((a, b) => b[1] - a[1])[0]
    const topCard = topCardEntry ? cards.find(c => c.id === topCardEntry[0]) : undefined

    const drinks = expenses.filter(t => t.category === 'drink').length
    const days = new Set(txs.map(t => t.date)).size

    const ownJobIds = new Set(work?.jobs.map(j => j.id) ?? [])
    const yearShifts = (work?.shifts ?? []).filter(s => s.date.startsWith(String(year)) && s.job_id && ownJobIds.has(s.job_id))
    const hours = yearShifts.reduce((s, sh) => s + shiftHours(sh.start_time, sh.end_time), 0)

    return {
      count: txs.length, days, spent, earned, topCats, topShop, byMonth, maxMonth, biggest,
      topCard, topCardCount: topCardEntry?.[1] ?? 0, drinks, shiftCount: yearShifts.length, hours,
    }
  }, [transactions, year, cards, work])

  if (!isLoaded) return <PageSkeleton />

  async function share() {
    const lines = [
      `我的 ${year} 易記帳回顧`,
      `記了 ${recap.count} 筆帳，花了 ${formatCurrency(recap.spent)}`,
      recap.topCats[0] && `花最多的是${getCategoryById(recap.topCats[0][0])?.name ?? ''}`,
      recap.topShop && `最常去「${recap.topShop[0]}」，去了 ${recap.topShop[1].count} 次`,
      recap.hours > 0 && `上了 ${recap.shiftCount} 班、${Math.round(recap.hours)} 小時`,
    ].filter(Boolean).join('\n')
    try {
      if (navigator.share) await navigator.share({ text: lines })
      else { await navigator.clipboard.writeText(lines); toast('已複製，可以貼給朋友') }
    } catch { /* 使用者取消分享 */ }
  }

  const monthMax = Math.max(...recap.byMonth, 1)

  return (
    <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:w-full lg:max-w-5xl lg:px-1 lg:py-8">
      <div>
        <Link href="/stats" className="mb-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-3.5" />收支分析
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">年度回顧</h1>
          {recap.count > 0 && (
            <button onClick={share} className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand-hover">
              <Share2Icon className="size-3.5" />分享
            </button>
          )}
        </div>
        {years.length > 1 && (
          <div className="mt-3 flex gap-1.5">
            {years.map(y => (
              <button
                key={y}
                onClick={() => setPicked(y)}
                className={cn('rounded-full px-3.5 py-1 text-sm font-medium transition-colors',
                  y === year ? 'bg-foreground text-background' : 'bg-white text-muted-foreground shadow-sm hover:bg-muted dark:bg-card')}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {recap.count === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-muted-foreground shadow-sm dark:bg-card">{year} 年還沒有記帳紀錄</div>
      ) : (
        <div key={year} className="stagger flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
          {/* 開場 */}
          <div className="rounded-3xl bg-brand p-6 text-brand-foreground">
            <p className="text-sm opacity-80">{year} 年，你記了</p>
            <p className="mt-1 text-5xl font-bold tabular-nums">{recap.count.toLocaleString()}<span className="ml-1 text-xl">筆帳</span></p>
            <p className="mt-2 text-sm opacity-80">一年裡有 {recap.days} 天打開來記帳</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
            <Stat label="總共花了" value={formatCurrency(recap.spent)} tone="text-rose-500" />
            <Stat label="總共收入" value={formatCurrency(recap.earned)} tone="text-emerald-600" />
          </div>

          {recap.topCats.length > 0 && (
            <Card title="錢都花到哪裡">
              <div className="flex flex-col gap-3">
                {recap.topCats.map(([cat, amount], i) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-4 text-sm font-bold text-muted-foreground">{i + 1}</span>
                    <CategoryBadge id={cat} />
                    <span className="flex-1 text-sm font-medium">{getCategoryById(cat)?.name ?? cat}</span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums">{formatCurrency(amount)}</span>
                      <span className="block text-xs text-muted-foreground">{Math.round((amount / recap.spent) * 100)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {recap.topShop && (
            <Card title="最常去的地方">
              <p className="text-2xl font-bold">{recap.topShop[0]}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                去了 <b className="text-foreground">{recap.topShop[1].count}</b> 次，總共 {formatCurrency(recap.topShop[1].total)}
              </p>
            </Card>
          )}

          <Card title="每個月花多少" className="lg:col-span-2">
            <div className="flex h-28 items-end gap-1 lg:h-40 lg:gap-2">
              {recap.byMonth.map((v, i) => (
                // 長條外面多包一層撐滿剩下的高度，百分比高度才有東西可以算（以前直接放在 flex 欄裡，高度一直是 0）
                <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn('w-full rounded-t-md', i === recap.maxMonth && v > 0 ? 'bg-brand' : 'bg-muted')}
                      style={{ height: `${Math.max((v / monthMax) * 100, v > 0 ? 4 : 2)}%` }}
                      title={`${i + 1} 月 ${formatCurrency(v)}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground lg:text-xs">{i + 1}</span>
                </div>
              ))}
            </div>
            {recap.byMonth[recap.maxMonth] > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                花最多的是 <b className="text-foreground">{recap.maxMonth + 1} 月</b>，{formatCurrency(recap.byMonth[recap.maxMonth])}
              </p>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4 lg:gap-4">
            {recap.biggest && (
              <Stat label="最大的一筆" value={formatCurrency(recap.biggest.amount)}
                sub={recap.biggest.description || recap.biggest.note || getCategoryById(recap.biggest.category)?.name} />
            )}
            {recap.drinks > 0 && <Stat label="喝了幾杯飲料" value={`${recap.drinks} 杯`} sub="記在「飲品」的次數" />}
            {recap.topCard && <Stat label="最常用的卡" value={recap.topCard.name} sub={`刷了 ${recap.topCardCount} 次`} />}
            {recap.hours > 0 && <Stat label="上班" value={`${Math.round(recap.hours)} 小時`} sub={`共 ${recap.shiftCount} 班`} />}
          </div>
        </div>
      )}
      <div className="h-6" />
    </div>
  )
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-white p-5 shadow-sm dark:bg-card', className)}>
      <p className="mb-3 text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="flex flex-col justify-center rounded-2xl bg-white p-4 shadow-sm dark:bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 truncate text-xl font-bold tabular-nums', tone)}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
