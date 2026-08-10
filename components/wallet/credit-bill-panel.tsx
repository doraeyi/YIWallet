'use client'

import { useState } from 'react'
import { XIcon, CheckIcon } from 'lucide-react'
import * as api from '@/lib/api'
import { formatCurrency } from '@/lib/finance-utils'
import { cn } from '@/lib/utils'

interface CreditBillPanelProps {
  bankName: string
  summary: api.BankCreditSummary | null
  loading: boolean
  onClose: () => void
  onRefresh: () => void | Promise<void>
}

export function CreditBillPanel({ bankName, summary, loading, onClose, onRefresh }: CreditBillPanelProps) {
  const [billingDay, setBillingDay] = useState(summary?.billing_day != null ? String(summary.billing_day) : '')
  const [savingDay, setSavingDay] = useState(false)
  const [payingClosing, setPayingClosing] = useState<string | null>(null)

  async function handleSaveBillingDay() {
    if (!billingDay) return
    setSavingDay(true)
    try {
      await api.updateBankCreditSetting(bankName, { billing_day: Number(billingDay) })
      await onRefresh()
    } finally {
      setSavingDay(false)
    }
  }

  async function handlePay(closingDate: string) {
    if (payingClosing) return
    setPayingClosing(closingDate)
    try {
      await api.payBankCreditBill(bankName, closingDate)
      await onRefresh()
    } finally {
      setPayingClosing(null)
    }
  }

  return (
    <div className="mx-4 -mt-2 mb-3 flex flex-col gap-3 rounded-xl border px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">信用卡帳單（{bankName}）</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <XIcon className="size-4" />
        </button>
      </div>

      {loading ? (
        <p className="py-2 text-center text-xs text-muted-foreground">載入中…</p>
      ) : (
        <>
          {/* 結帳日設定 */}
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs text-muted-foreground">結帳日（每月幾號）</label>
            <input
              type="number"
              min="1"
              max="31"
              value={billingDay}
              onChange={e => setBillingDay(e.target.value)}
              placeholder="例：15"
              className="w-16 rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-amber-400"
            />
            <button
              onClick={handleSaveBillingDay}
              disabled={savingDay || !billingDay}
              className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {savingDay ? '儲存中…' : '儲存'}
            </button>
          </div>

          {summary && summary.billing_day != null ? (
            <>
              {/* 額度資訊 */}
              <div className="flex justify-around rounded-lg bg-muted/30 py-2.5">
                <div className="flex flex-col items-center">
                  <p className="text-[11px] text-muted-foreground">信用額度</p>
                  <p className="text-sm font-semibold">{formatCurrency(summary.credit_limit)}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[11px] text-muted-foreground">本期消費</p>
                  <p className="text-sm font-semibold text-rose-500">{formatCurrency(summary.current_period_spend)}</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-[11px] text-muted-foreground">可用額度</p>
                  <p className="text-sm font-semibold text-emerald-600">{formatCurrency(summary.available_credit)}</p>
                </div>
              </div>

              {/* 待繳帳單 */}
              {summary.unpaid_bills.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">待繳帳單</p>
                  {summary.unpaid_bills.map(bill => (
                    <div key={bill.closing_date} className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-900/20">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{bill.period_start} ～ {bill.period_end}</span>
                        <span className="text-sm font-semibold text-rose-600">{formatCurrency(bill.amount)}</span>
                      </div>
                      <button
                        onClick={() => handlePay(bill.closing_date)}
                        disabled={payingClosing === bill.closing_date}
                        className={cn(
                          'flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-card',
                        )}
                      >
                        <CheckIcon className="size-3.5" />
                        {payingClosing === bill.closing_date ? '處理中…' : '標記已繳'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">設定結帳日後才會依結帳週期即時計算本期消費／可用額度</p>
          )}
        </>
      )}
    </div>
  )
}
