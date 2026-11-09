'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CheckIcon, CreditCardIcon, PlusIcon } from 'lucide-react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCards } from '@/hooks/use-cards'
import { todayString, formatCurrency } from '@/lib/finance-utils'
import { cn } from '@/lib/utils'
import { AddCardSheet } from './add-card-sheet'
import { PaymentIcon } from './payment-icon'

// 新帳號第一次進首頁：問兩個問題就好（錢包有多少現金、有沒有常用的卡），然後直接去記第一筆。
// 以前是 13 步的導覽，還沒用到 App 就先看完一堆說明；那份導覽留在「設定 → 再看一次使用教學」。
//
// 什麼時候出現（只在首頁）：
// - 帳號密碼註冊完會帶 ?welcome=1
// - 還沒有任何記帳跟卡片的帳號（Google 第一次登入的新帳號也算），在這台裝置第一次進首頁
// 做完或略過就記在這台裝置，不再自動出現。

const SETUP_DONE_KEY = 'yiwallet_setup_done'
const TOUR_DONE_KEY = 'yiwallet_tour_done'
const CASH_CHIPS = [0, 500, 1000, 2000, 5000]

function isDone(): boolean {
  try { return localStorage.getItem(SETUP_DONE_KEY) === '1' || localStorage.getItem(TOUR_DONE_KEY) === '1' } catch { return false }
}

export function FirstSetup() {
  const pathname = usePathname()
  const { transactions, isLoaded, addTransaction } = useTransactions()
  const { cards, isLoaded: cardsLoaded } = useCards()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [cash, setCash] = useState('')
  const [addCardOpen, setAddCardOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (pathname !== '/dashboard' || open || !isLoaded || !cardsLoaded) return
    const params = new URLSearchParams(window.location.search)
    if (params.has('tour')) return // 手動重看教學時交給 OnboardingTour
    const brandNew = transactions.length === 0 && cards.length === 0
    if (isDone() || !(params.has('welcome') || brandNew)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 要等首頁資料載入、確認是全新帳號才開，只能在 effect 裡決定
    setOpen(true)
  }, [pathname, open, isLoaded, cardsLoaded, transactions.length, cards.length])

  const cashValue = Number(cash.replace(/\D/g, '')) || 0

  function close() {
    setOpen(false)
    try { localStorage.setItem(SETUP_DONE_KEY, '1') } catch {}
    window.history.replaceState(null, '', window.location.pathname)
  }

  async function finish() {
    setSaving(true)
    try {
      if (cashValue > 0) {
        await addTransaction({
          type: 'income', amount: cashValue, category: 'other-income',
          note: '期初現金', date: todayString(), isCash: true,
        })
      }
    } catch {
      // 記不進去不擋人：之後用「數錢包」也能補
    } finally {
      setSaving(false)
      close()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[45] overflow-y-auto bg-background" role="dialog" aria-modal="true" aria-label="開始使用易記帳">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map(i => (
              <span key={i} className={cn('h-1 w-8 rounded-full transition-colors duration-300', i <= step ? 'bg-brand' : 'bg-muted')} />
            ))}
          </div>
          <button onClick={close} className="text-sm text-muted-foreground hover:text-foreground">略過</button>
        </div>

        {step === 0 && (
          <div key="s0" className="flex flex-1 flex-col animate-rise">
            <h1 className="mt-10 text-2xl font-semibold leading-snug">錢包裡現在有多少現金？</h1>
            <p className="mt-2 text-sm text-muted-foreground">大概就好，之後隨時可以用「數錢包」校正。</p>
            <label className="mt-8 flex items-baseline gap-1 border-b-2 border-foreground/20 pb-2 focus-within:border-brand">
              <span className="font-display text-5xl font-medium text-muted-foreground">$</span>
              <input
                value={cashValue ? cashValue.toLocaleString('en-US') : ''}
                onChange={e => setCash(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                aria-label="錢包現金"
                className="min-w-0 flex-1 bg-transparent font-display text-5xl font-medium tabular-nums outline-none placeholder:text-muted-foreground/40"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {CASH_CHIPS.map(v => (
                <button
                  key={v}
                  onClick={() => setCash(String(v))}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    cashValue === v && cash !== '' ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
                  )}
                >
                  {v === 0 ? '沒帶現金' : v.toLocaleString('en-US')}
                </button>
              ))}
            </div>
            <div className="mt-auto pt-10">
              <button onClick={() => setStep(1)} className="h-14 w-full rounded-2xl bg-brand text-base font-semibold text-brand-foreground hover:bg-brand-hover">
                下一步
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div key="s1" className="flex flex-1 flex-col animate-rise">
            <h1 className="mt-10 text-2xl font-semibold leading-snug">有常用的卡嗎？</h1>
            <p className="mt-2 text-sm text-muted-foreground">信用卡、金融卡、悠遊卡都可以。選銀行、填卡號後四碼就好。沒有的話先跳過，只用現金也行。</p>

            {cards.length > 0 && (
              <ul className="mt-6 flex flex-col gap-2">
                {cards.map(c => (
                  <li key={c.id} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 animate-pop">
                    <span className="flex size-9 items-center justify-center rounded-xl text-white" style={{ backgroundColor: c.color }}>
                      <PaymentIcon kind={c.type} className="size-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{c.name}</span>
                    <CheckIcon className="size-4 text-emerald-600" />
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setAddCardOpen(true)}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-base font-medium text-muted-foreground transition-colors hover:border-brand hover:text-brand-text"
            >
              {cards.length > 0 ? <PlusIcon className="size-5" /> : <CreditCardIcon className="size-5" />}
              {cards.length > 0 ? '再加一張' : '加一張卡'}
            </button>

            <div className="mt-auto flex gap-2 pt-10">
              <button onClick={() => setStep(0)} className="h-14 rounded-2xl border px-5 text-base font-medium hover:bg-muted/50">上一步</button>
              <button onClick={() => setStep(2)} className="h-14 flex-1 rounded-2xl bg-brand text-base font-semibold text-brand-foreground hover:bg-brand-hover">
                {cards.length > 0 ? '下一步' : '先只用現金'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div key="s2" className="flex flex-1 flex-col animate-rise">
            <h1 className="mt-10 text-2xl font-semibold leading-snug">都好了，來記第一筆</h1>
            <ul className="mt-6 flex flex-col gap-3 text-sm">
              <li className="flex gap-3">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>錢包現金 <strong className="font-semibold">{formatCurrency(cashValue)}</strong>{cards.length > 0 ? `，${cards.length} 張卡` : ''}</span>
              </li>
              <li className="flex gap-3">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>首頁按「記一筆」，輸入金額、按 OK。付款方式會記住你上次用的。</span>
              </li>
              <li className="flex gap-3">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>晚上漏記了，首頁會提醒你一次補完；錢包對不上就點「數錢包」。</span>
              </li>
            </ul>
            <div className="mt-auto flex gap-2 pt-10">
              <button onClick={() => setStep(1)} className="h-14 rounded-2xl border px-5 text-base font-medium hover:bg-muted/50">上一步</button>
              <button
                onClick={finish}
                disabled={saving}
                className="h-14 flex-1 rounded-2xl bg-brand text-base font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
              >
                {saving ? '設定中…' : '開始記帳'}
              </button>
            </div>
          </div>
        )}
      </div>

      <AddCardSheet open={addCardOpen} onOpenChange={setAddCardOpen} />
    </div>
  )
}
