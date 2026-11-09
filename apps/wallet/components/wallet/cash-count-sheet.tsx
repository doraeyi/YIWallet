'use client'

import { useState } from 'react'
import { MinusIcon, XIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/finance-utils'
import { useCountUp } from '@/hooks/use-count-up'
import type { Transaction } from '@/lib/types'

/** 錢包裡「應該有」多少現金：沒掛卡片、而且明確是現金（選了現金、領現、舊版記在瀏覽器裡的現金）的收入減支出。
 *  還沒指定付款方式的紀錄不算，不然像薪水這種還沒歸戶的收入會被當成錢包裡的錢。 */
export function cashOnHand(transactions: Transaction[]): number {
  let legacy = new Set<string>()
  try { legacy = new Set(JSON.parse(localStorage.getItem('yiwallet_cash_tx_ids') ?? '[]')) } catch {}
  let sum = 0
  for (const t of transactions) {
    if (t.cardId) continue
    if (!(t.isCash || /領現 \d{4}-\d{2}-\d{2}$/.test(t.note) || legacy.has(t.id))) continue
    sum += t.type === 'income' ? t.amount : -t.amount
  }
  return sum
}

const BILLS = [
  { value: 1000, tone: 'bg-[oklch(0.62_0.07_240)]' },
  { value: 500, tone: 'bg-[oklch(0.6_0.08_60)]' },
  { value: 100, tone: 'bg-[oklch(0.58_0.12_25)]' },
]
const COINS = [
  { value: 50, tone: 'from-[oklch(0.9_0.09_90)] to-[oklch(0.74_0.11_80)] text-[oklch(0.35_0.07_70)]' },
  { value: 10, tone: 'from-[oklch(0.9_0.09_90)] to-[oklch(0.74_0.11_80)] text-[oklch(0.35_0.07_70)]' },
  { value: 5, tone: 'from-[oklch(0.93_0.01_85)] to-[oklch(0.76_0.015_85)] text-[oklch(0.35_0.02_80)]' },
  { value: 1, tone: 'from-[oklch(0.93_0.01_85)] to-[oklch(0.76_0.015_85)] text-[oklch(0.35_0.02_80)]' },
]

interface CashCountSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 帳上現金（cashOnHand） */
  expected: number
  /** 把差額記成一筆現金收支；回傳 reject 代表記失敗 */
  onRecordDiff: (diff: { type: 'expense' | 'income'; amount: number }) => Promise<unknown>
}

export function CashCountSheet({ open, onOpenChange, expected, onRecordDiff }: CashCountSheetProps) {
  const [tally, setTally] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  // 不管從哪裡關（X、拖下去、記好差額）都歸零，下次打開從 0 開始數
  function handleOpenChange(next: boolean) {
    if (!next) { setTally({}); setError(false) }
    onOpenChange(next)
  }

  const counted = Object.entries(tally).reduce((s, [v, n]) => s + Number(v) * n, 0)
  const animated = useCountUp(counted)
  const touched = counted > 0
  const diff = expected - counted // 正數 = 比帳上少

  function add(value: number) {
    setTally(t => ({ ...t, [value]: (t[value] ?? 0) + 1 }))
  }
  function remove(value: number) {
    setTally(t => ({ ...t, [value]: Math.max(0, (t[value] ?? 0) - 1) }))
  }

  async function record() {
    if (diff === 0) { handleOpenChange(false); return }
    setSaving(true)
    setError(false)
    try {
      await onRecordDiff({ type: diff > 0 ? 'expense' : 'income', amount: Math.abs(diff) })
      handleOpenChange(false)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const result = !touched
    ? `帳上應該有 ${formatCurrency(expected)}，把手上的鈔票和硬幣一張張點進來`
    : diff === 0
      ? '剛剛好，跟帳上對得上'
      : diff > 0
        ? `比帳上少了 ${formatCurrency(diff)}`
        : `比帳上多了 ${formatCurrency(-diff)}`

  const actionLabel = diff === 0
    ? '對上了，完成'
    : diff > 0
      ? `把少掉的 ${formatCurrency(diff)} 記成一筆支出`
      : `把多出的 ${formatCurrency(-diff)} 記成一筆收入`

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0 p-0 data-[side=bottom]:h-dvh lg:data-[side=bottom]:h-auto lg:data-[side=bottom]:max-h-[92dvh]">
        <SheetTitle className="sr-only">數錢包</SheetTitle>
        <div className="mx-auto flex h-full w-full max-w-md flex-col">
          <div className="flex items-center justify-between px-3 py-2.5">
            <button onClick={() => handleOpenChange(false)} aria-label="關閉" className="flex size-9 items-center justify-center rounded-full hover:bg-muted">
              <XIcon className="size-5" />
            </button>
            <span className="text-sm font-semibold">數錢包</span>
            <span className="size-9" />
          </div>

          {/* 數到哪、跟帳上差多少 */}
          <div className="px-6 pt-2 pb-5">
            <p className="text-sm text-muted-foreground">手上共有</p>
            <p className="font-display text-6xl font-medium tabular-nums leading-tight">{formatCurrency(animated)}</p>
            <p
              aria-live="polite"
              className={cn('mt-1 min-h-10 text-sm', touched && diff !== 0 ? 'font-medium text-brand-text' : 'text-muted-foreground')}
            >
              {result}
            </p>
          </div>

          {/* 鈔票：點一下加一張 */}
          <div className="flex flex-col gap-2.5 px-5">
            {BILLS.map(b => {
              const n = tally[b.value] ?? 0
              return (
                <div key={b.value} className="relative">
                  <button
                    onClick={() => add(b.value)}
                    aria-label={`${b.value} 元鈔票，已數 ${n} 張，點一下加一張`}
                    className={cn('flex h-[72px] w-full items-center justify-between rounded-xl px-5 text-white shadow-sm ring-1 ring-black/10 transition-transform duration-150 active:translate-y-0.5', b.tone)}
                  >
                    <span className="font-display text-3xl font-medium tabular-nums">{b.value}</span>
                    <span className="text-lg font-medium tabular-nums opacity-90">{n > 0 ? `× ${n}` : ''}</span>
                  </button>
                  {n > 0 && (
                    <button
                      onClick={() => remove(b.value)}
                      aria-label={`${b.value} 元少一張`}
                      className="absolute -top-2 -right-1 flex size-7 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-foreground/15"
                    >
                      <MinusIcon className="size-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* 硬幣 */}
          <div className="grid grid-cols-4 justify-items-center gap-2 px-5 pt-5">
            {COINS.map(c => {
              const n = tally[c.value] ?? 0
              return (
                <div key={c.value} className="relative">
                  <button
                    onClick={() => add(c.value)}
                    aria-label={`${c.value} 元硬幣，已數 ${n} 個，點一下加一個`}
                    className={cn('flex size-[68px] items-center justify-center rounded-full bg-gradient-to-br font-display text-xl font-semibold shadow-sm ring-1 ring-black/15 transition-transform duration-150 active:scale-90', c.tone)}
                  >
                    {c.value}
                  </button>
                  {n > 0 && (
                    <button
                      onClick={() => remove(c.value)}
                      aria-label={`${c.value} 元少一個`}
                      className="absolute -top-1.5 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-semibold text-background"
                    >
                      {n}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-auto px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+20px)]">
            {error && <p className="mb-2 text-center text-sm text-rose-500">記帳失敗，請再試一次</p>}
            <button
              onClick={record}
              disabled={!touched || saving}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-base font-semibold text-brand-foreground transition-colors hover:bg-brand-hover disabled:bg-muted disabled:text-muted-foreground"
            >
              {saving ? '記錄中…' : touched ? actionLabel : '先數數看'}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
