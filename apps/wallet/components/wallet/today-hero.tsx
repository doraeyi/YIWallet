'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { PlusIcon, WalletIcon, XIcon } from 'lucide-react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCountUp } from '@/hooks/use-count-up'
import { filterByMonth, formatCurrency, sumByType, todayString } from '@/lib/finance-utils'
import { AddTransactionSheet } from './add-transaction-sheet'
import { CashCountSheet, cashOnHand } from './cash-count-sheet'
import { QuickEntries } from './quick-entries'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const NUDGE_KEY = 'yiwallet_nudge_dismissed'
const NUDGE_HOUR = 18

function nudgeDismissedToday(): boolean {
  try { return localStorage.getItem(NUDGE_KEY) === todayString() } catch { return false }
}

/** 首頁最上面：先回答「今天花了多少」，然後就是記一筆。月總覽、圓餅圖都往下收。 */
export function TodayHero() {
  const { transactions, budget, addTransaction } = useTransactions()
  // 桌面圖示的捷徑（?add=1 記一筆、?count=1 數錢包）：打開首頁就直接進去
  const [addOpen, setAddOpen] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('add'))
  const [batchOpen, setBatchOpen] = useState(false)
  const [countOpen, setCountOpen] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('count'))
  const [nudgeHidden, setNudgeHidden] = useState(nudgeDismissedToday)

  const now = new Date()
  const today = todayString()
  const todayTxs = useMemo(() => transactions.filter(t => t.date === today), [transactions, today])
  const spentToday = sumByType(todayTxs, 'expense')
  const monthSpent = sumByType(filterByMonth(transactions, now.getFullYear(), now.getMonth() + 1), 'expense')
  const cash = useMemo(() => cashOnHand(transactions), [transactions])
  const animatedToday = useCountUp(spentToday)

  const hour = now.getHours()
  const greeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安'
  const showNudge = hour >= NUDGE_HOUR && !nudgeHidden
  const left = budget > 0 ? budget - monthSpent : null

  function dismissNudge() {
    setNudgeHidden(true)
    try { localStorage.setItem(NUDGE_KEY, today) } catch {}
  }

  async function recordCashDiff({ type, amount }: { type: 'expense' | 'income'; amount: number }) {
    await addTransaction({
      type, amount, category: type === 'expense' ? 'other-expense' : 'other-income',
      note: '現金對帳', date: today, isCash: true,
    })
    toast(type === 'expense' ? `少掉的 ${formatCurrency(amount)} 記好了` : `多出的 ${formatCurrency(amount)} 記好了`)
  }

  return (
    <section aria-label="今天" className="px-5 pb-5 lg:col-span-2 lg:px-1 lg:pb-6">
      {/* 電腦版頁首已經有問候和月份，這行只留給手機版 */}
      <p className="text-sm text-muted-foreground lg:hidden">
        {greeting}，{format(now, 'M月d日 EEEE', { locale: zhTW })}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">今天花了</p>
          {/* 五位數以上字縮小，才不會撞到右邊的錢包現金 */}
          <p className={cn('font-display font-medium leading-none tracking-tight tabular-nums', spentToday >= 10000 ? 'text-5xl' : 'text-[64px]')}>
            {formatCurrency(animatedToday)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {todayTxs.length > 0 ? `共 ${todayTxs.length} 筆` : '今天還沒有紀錄'}
            {left !== null && (
              <span className={left < 0 ? 'text-rose-500' : undefined}>
                {' · '}{left >= 0 ? `本月還剩 ${formatCurrency(left)}` : `本月超支 ${formatCurrency(-left)}`}
              </span>
            )}
          </p>
        </div>

        {/* 錢包現金：點一下就是數錢包對帳 */}
        <button
          onClick={() => setCountOpen(true)}
          aria-label={`錢包現金 ${formatCurrency(cash)}，點一下數錢包對帳`}
          className="flex shrink-0 flex-col items-start rounded-2xl border bg-card px-3.5 py-2.5 text-left shadow-sm transition-colors hover:bg-muted/50"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <WalletIcon className="size-3.5" />錢包現金
          </span>
          <span className="font-display text-xl font-medium tabular-nums">{formatCurrency(cash)}</span>
          <span className="text-[11px] text-brand-text">點一下數錢包</span>
        </button>
      </div>

      <button
        onClick={() => setAddOpen(true)}
        data-tour="add-hero"
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl lg:max-w-sm bg-brand text-base font-semibold text-brand-foreground shadow-[0_8px_20px_-10px_var(--brand)] transition-colors hover:bg-brand-hover"
      >
        <PlusIcon className="size-5" strokeWidth={2.5} />記一筆
      </button>

      <QuickEntries />

      {showNudge && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border bg-card py-2.5 pr-2 pl-4 animate-rise">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">晚上了，今天有花沒記到嗎？</p>
            <p className="text-xs text-muted-foreground">一次補完，記幾筆都可以</p>
          </div>
          <button
            onClick={() => setBatchOpen(true)}
            className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            補記
          </button>
          <button onClick={dismissNudge} aria-label="今天不再提醒" className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      <AddTransactionSheet open={addOpen} onOpenChange={setAddOpen} onSubmit={addTransaction} />
      <AddTransactionSheet open={batchOpen} onOpenChange={setBatchOpen} onSubmit={addTransaction} batch />
      <CashCountSheet open={countOpen} onOpenChange={setCountOpen} expected={cash} onRecordDiff={recordCashDiff} />
    </section>
  )
}
