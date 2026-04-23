'use client'

import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import type { Card } from '@/lib/types'

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
  const [paymentDueDate, setPaymentDueDate] = useState(card.paymentDueDate ?? '')
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(String(card.notifyDaysBefore ?? 1))
  const [notifyTime, setNotifyTime] = useState(card.notifyTime ?? '09:00')
  const [saving, setSaving] = useState(false)

  const hasNotification = card.type === 'easycard' || card.type === 'credit'

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(card.id, {
        ...card,
        balance: (card.type === 'debit' || card.type === 'easycard') && balance !== ''
          ? Number(balance) : undefined,
        passExpiryDate: card.type === 'easycard' && passExpiryDate ? passExpiryDate : undefined,
        paymentDueDate: card.type === 'credit' && paymentDueDate ? paymentDueDate : undefined,
        notifyDaysBefore: hasNotification ? Number(notifyDaysBefore) : undefined,
        notifyTime: hasNotification ? notifyTime : undefined,
      })
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
              className="w-full rounded-xl border bg-muted/30 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-amber-400"
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
            className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
          />
          <p className="text-[11px] text-muted-foreground">到期前一天 LINE Bot 會提醒你續卡</p>
        </div>
      )}

      {/* 信用卡：繳費截止日 */}
      {card.type === 'credit' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">繳費截止日</label>
          <input
            type="date"
            value={paymentDueDate}
            onChange={e => setPaymentDueDate(e.target.value)}
            className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
          />
          <p className="text-[11px] text-muted-foreground">到期前一天 LINE Bot 會提醒你繳費</p>
        </div>
      )}

      {/* 通知設定（悠遊卡／信用卡） */}
      {hasNotification && (
        <div className="flex flex-col gap-3 rounded-xl border px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">LINE Bot 通知設定</p>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">提前幾天</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={notifyDaysBefore}
                  onChange={e => setNotifyDaysBefore(e.target.value.replace(/\D/g, '') || '1')}
                  className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                <span className="shrink-0 text-xs text-muted-foreground">天前</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">通知時間</label>
              <input
                type="time"
                value={notifyTime}
                onChange={e => setNotifyTime(e.target.value)}
                className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {card.type === 'easycard' && passExpiryDate
              ? `月票 ${passExpiryDate} → 提前 ${notifyDaysBefore} 天的 ${notifyTime} 通知`
              : card.type === 'credit' && paymentDueDate
              ? `繳費截止 ${paymentDueDate} → 提前 ${notifyDaysBefore} 天的 ${notifyTime} 通知`
              : '請先設定日期'}
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
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
