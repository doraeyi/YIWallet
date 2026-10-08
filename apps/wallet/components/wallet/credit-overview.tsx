'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import * as api from '@/lib/api'
import { dayOfMonth } from '@/lib/utils'
import { formatCurrency } from '@/lib/finance-utils'
import type { Card, Transaction } from '@/lib/types'

interface BankOverview {
  bank: string
  cards: Card[]
  total: number
  perCard: { card: Card; spend: number }[]
  periodLabel: string
  hasBillingDay: boolean
  availableCredit: number | null
  unpaid: { amount: number; due: Date | null } | null
}

// 下一次的繳費日：這個月的那天還沒過就是這個月，過了就是下個月（沒有那天的月份用月底）
function nextDueDate(day: number, today = new Date()): Date {
  const clamp = (y: number, m: number) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()))
  const thisMonth = clamp(today.getFullYear(), today.getMonth())
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return thisMonth >= startOfToday ? thisMonth : clamp(today.getFullYear(), today.getMonth() + 1)
}

// 首頁「全部」的信用卡區塊：同一家銀行的卡共用額度、帳單也一起繳，所以合併加總，
// 再列出每張卡各花多少，使用者不用自己加減。有設結帳日就用後端算的「本期」，
// 沒設就退回這個月的加總。
export function CreditOverview({ cards, transactions }: { cards: Card[]; transactions: Transaction[] }) {
  const creditCards = useMemo(() => cards.filter(c => c.type === 'credit'), [cards])
  const banks = useMemo(() => {
    const map = new Map<string, Card[]>()
    for (const c of creditCards) {
      const key = c.bank ?? c.name
      map.set(key, [...(map.get(key) ?? []), c])
    }
    return map
  }, [creditCards])

  const [summaries, setSummaries] = useState<Record<string, api.BankCreditSummary | null>>({})

  // 交易有變（新增／編輯／自動記帳）就重抓，數字才會跟著動
  const txKey = useMemo(() => transactions.map(t => `${t.id}:${t.amount}:${t.cardId ?? ''}`).join(','), [transactions])
  useEffect(() => {
    let cancelled = false
    Promise.all([...banks.keys()].map(async bank => [bank, await api.fetchBankCreditSummary(bank).catch(() => null)] as const))
      .then(entries => { if (!cancelled) setSummaries(Object.fromEntries(entries)) })
    return () => { cancelled = true }
  }, [banks, txKey])

  const overviews: BankOverview[] = useMemo(() => {
    const now = new Date()
    const monthPrefix = format(now, 'yyyy-MM')
    return [...banks.entries()].map(([bank, bankCards]) => {
      const summary = summaries[bank]
      const dueDay = bankCards.map(c => dayOfMonth(c.paymentDueDate)).find(d => d != null) ?? null
      const due = dueDay ? nextDueDate(dueDay, now) : null

      if (summary && summary.billing_day != null && summary.last_closing_date) {
        const last = parseISO(summary.last_closing_date)
        const start = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
        const latestUnpaid = summary.unpaid_bills[0]
        return {
          bank,
          cards: bankCards,
          total: summary.current_period_spend,
          perCard: bankCards.map(card => ({
            card,
            spend: summary.card_breakdown.find(b => String(b.card_id) === card.id)?.spend ?? 0,
          })),
          periodLabel: `本期 ${format(start, 'M/d')} 起`,
          hasBillingDay: true,
          availableCredit: summary.credit_limit > 0 ? summary.available_credit : null,
          unpaid: latestUnpaid ? { amount: latestUnpaid.amount, due } : null,
        }
      }

      // 沒設結帳日：用這個月的交易加總
      const perCard = bankCards.map(card => ({
        card,
        spend: transactions
          .filter(t => t.cardId === card.id && t.type === 'expense' && t.date.startsWith(monthPrefix))
          .reduce((s, t) => s + t.amount, 0),
      }))
      return {
        bank,
        cards: bankCards,
        total: perCard.reduce((s, p) => s + p.spend, 0),
        perCard,
        periodLabel: '本月',
        hasBillingDay: false,
        availableCredit: null,
        unpaid: null,
      }
    })
  }, [banks, summaries, transactions])

  if (overviews.length === 0) return null

  return (
    <div className="px-4 pb-4 lg:px-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold">信用卡</span>
        <Link href="/statements" className="text-xs font-medium text-brand-text hover:underline">帳單明細</Link>
      </div>
      <div className="stagger flex flex-col gap-2">
        {overviews.map(o => (
          <div key={o.bank} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-card">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{o.bank}</p>
                <p className="text-xs text-muted-foreground">
                  {o.periodLabel}・{o.cards.length > 1 ? `${o.cards.length} 張卡合計` : o.cards[0].name}
                </p>
              </div>
              <p className="shrink-0 text-lg font-bold tabular-nums text-rose-500">{formatCurrency(o.total)}</p>
            </div>

            {/* 同一家銀行有多張卡時，列出每張各花多少 */}
            {o.cards.length > 1 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {o.perCard.map(({ card, spend }) => (
                  <div key={card.id} className="flex items-center gap-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: card.color }} />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{card.name}</span>
                    <span className="tabular-nums">{formatCurrency(spend)}</span>
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${o.total > 0 ? (spend / o.total) * 100 : 0}%`, backgroundColor: card.color }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2.5 text-xs">
              {o.unpaid ? (
                <span className="font-medium text-rose-500">
                  待繳 {formatCurrency(o.unpaid.amount)}{o.unpaid.due && `・${format(o.unpaid.due, 'M/d')} 截止`}
                </span>
              ) : o.hasBillingDay ? (
                <span className="text-emerald-600">沒有待繳帳單</span>
              ) : (
                <Link href="/settings" className="text-brand-text hover:underline">設定結帳日，就能算出每期要繳多少 ›</Link>
              )}
              {o.availableCredit != null && (
                <span className="text-muted-foreground">可用額度 {formatCurrency(o.availableCredit)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
