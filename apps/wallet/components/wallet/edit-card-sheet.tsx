'use client'

import { useEffect, useState } from 'react'
import { XIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import type { Card } from '@/lib/types'
import * as api from '@/lib/api'
import { dayOfMonth } from '@/lib/utils'

interface EditCardSheetProps {
  card: Card
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, data: Omit<Card, 'id'>) => Promise<void>
}

export function EditCardSheet({ card, open, onOpenChange, onSave }: EditCardSheetProps) {
  const isDesktop = useIsDesktop()
  const [balance, setBalance] = useState(card.balance != null ? String(card.balance) : '')
  const [passExpiryDate, setPassExpiryDate] = useState(card.passExpiryDate ?? '')
  const [paymentDueDay, setPaymentDueDay] = useState(String(dayOfMonth(card.paymentDueDate) ?? ''))
  // 結帳日存在銀行層級（BankCreditSetting），同一家銀行的信用卡共用，開啟時才去拿
  const [billingDay, setBillingDay] = useState('')
  const [initialBillingDay, setInitialBillingDay] = useState('')
  const [reminderDay, setReminderDay] = useState(card.reminderDay != null ? String(card.reminderDay) : '')
  const [saving, setSaving] = useState(false)

  const hasNotification = card.type === 'easycard' || card.type === 'credit'
  const hasBillingSetting = card.type === 'credit' && !!card.bank

  useEffect(() => {
    if (!open || !hasBillingSetting) return
    api.fetchBankCreditSetting(card.bank!)
      .then(s => {
        const v = s.billing_day != null ? String(s.billing_day) : ''
        setBillingDay(v)
        setInitialBillingDay(v)
      })
      .catch(() => {})
  }, [open, hasBillingSetting, card.bank])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(card.id, {
        ...card,
        balance: (card.type === 'debit' || card.type === 'easycard') && balance !== ''
          ? Number(balance) : undefined,
        passExpiryDate: card.type === 'easycard' && passExpiryDate ? passExpiryDate : undefined,
        paymentDueDate: card.type === 'credit' && paymentDueDay ? paymentDueDay : undefined,
        reminderDay: hasNotification && reminderDay ? Number(reminderDay) : undefined,
      })
      if (hasBillingSetting && billingDay !== initialBillingDay) {
        await api.updateBankCreditSetting(card.bank!, { billing_day: billingDay ? Number(billingDay) : null })
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const typeEmoji = card.type === 'credit' ? '💳' : card.type === 'easycard' ? '🚌' : '🏧'
  const typeLabel = card.type === 'credit' ? '信用卡' : card.type === 'easycard' ? '悠遊卡' : '金融卡'

  const formContent = (
    <div className="flex flex-col gap-5 p-5">
      {/* 卡片資訊（唯讀） */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-white"
          style={{ backgroundColor: card.color }}
        >
          {typeEmoji}
        </div>
        <div>
          <p className="text-sm font-semibold">{card.name}</p>
          <p className="text-xs text-muted-foreground">{typeLabel}</p>
        </div>
      </div>

      {/* 金融卡／悠遊卡：餘額 */}
      {(card.type === 'debit' || card.type === 'easycard') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">目前餘額</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input
              value={balance}
              onChange={e => setBalance(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              inputMode="numeric"
              className="w-full rounded-xl border bg-muted/30 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
      )}

      {/* 悠遊卡：月票到期日 */}
      {card.type === 'easycard' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">月票到期日</label>
          <input
            type="date"
            value={passExpiryDate}
            onChange={e => setPassExpiryDate(e.target.value)}
            className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
          <p className="text-[11px] text-muted-foreground">下方可設定推播提醒時機</p>
        </div>
      )}

      {/* 信用卡：結帳日 + 繳費截止日（都是每月幾號） */}
      {card.type === 'credit' && (
        <div className="flex flex-col gap-3">
          {hasBillingSetting && (
            <DayOfMonthField
              label="結帳日"
              value={billingDay}
              onChange={setBillingDay}
              hint={billingDay
                ? `每期是 ${Number(billingDay) % 31 + 1} 號到下個月 ${billingDay} 號，${billingDay} 號當天刷的算當期。${card.bank}的信用卡共用這個結帳日`
                : `${card.bank}的信用卡共用這個結帳日；沒設定的話本期消費會用日曆月計算`}
            />
          )}
          <DayOfMonthField
            label="繳費截止日"
            value={paymentDueDay}
            onChange={setPaymentDueDay}
            hint="下方可設定推播提醒時機"
          />
        </div>
      )}

      {/* 通知設定（悠遊卡／信用卡） */}
      {hasNotification && (
        <div className="flex flex-col gap-3 overflow-hidden rounded-xl border px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">推播提醒設定</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">每月幾號提醒（選填）</label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="不設定則到期前 3 天內每天提醒"
              value={reminderDay}
              onChange={e => setReminderDay(e.target.value)}
              className="w-24 rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {reminderDay
              ? `每月 ${reminderDay} 號固定推播提醒`
              : '沒填的話，系統預設在到期前 3 天內每天推播提醒'}
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
      >
        {saving ? '儲存中…' : '儲存'}
      </button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="p-0 max-w-sm overflow-y-auto max-h-[90dvh]">
          <DialogTitle className="sr-only">編輯卡片</DialogTitle>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <button onClick={() => onOpenChange(false)} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <XIcon className="size-4" />
            </button>
            <span className="text-base font-semibold">編輯卡片</span>
            <div className="size-8" />
          </div>
          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl p-0 max-h-[90dvh] overflow-y-auto">
        <SheetTitle className="sr-only">編輯卡片</SheetTitle>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <button onClick={() => onOpenChange(false)} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <XIcon className="size-4" />
          </button>
          <span className="text-base font-semibold">編輯卡片</span>
          <div className="size-8" />
        </div>
        {formContent}
      </SheetContent>
    </Sheet>
  )
}

function DayOfMonthField({ label, value, onChange, hint }: {
  label: string
  value: string
  onChange: (v: string) => void
  hint: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 text-sm">
        <span>每月</span>
        <input
          value={value}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 2)
            onChange(v === '' || (Number(v) >= 1 && Number(v) <= 31) ? v : value)
          }}
          placeholder="—"
          inputMode="numeric"
          className="w-16 rounded-xl border bg-muted/30 px-3 py-2 text-center text-sm outline-none focus:border-brand"
        />
        <span>號</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}
