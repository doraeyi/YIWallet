'use client'

import { useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { CASH_KEY } from '@/hooks/use-total-scope'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { Card } from '@/lib/types'

const TYPE_EMOJI: Record<Card['type'], string> = { debit: '🏧', credit: '💳', easycard: '🚌' }

// 勾選「全部」要計入哪些付款方式；按完成才存，中途取消不會改到
export function TotalScopeDialog({
  open, onOpenChange, cards, excluded, onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cards: Card[]
  excluded: Set<string>
  onSave: (next: Set<string>) => Promise<void>
}) {
  const [draft, setDraft] = useState(excluded)
  const [saving, setSaving] = useState(false)

  const options = [
    { key: CASH_KEY, emoji: '💵', name: '現金' },
    ...cards.map(c => ({ key: c.id, emoji: TYPE_EMOJI[c.type], name: c.name })),
  ]

  function toggle(key: string) {
    setDraft(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(draft)
      onOpenChange(false)
    } catch {
      toast('儲存失敗，請再試一次', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (o) setDraft(excluded); onOpenChange(o) }}>
      <DialogContent showCloseButton={false} className="max-w-sm gap-0 p-0">
        <DialogTitle className="px-5 pt-5 text-base font-semibold">「全部」要計入哪些</DialogTitle>
        <p className="px-5 pt-1 text-xs text-muted-foreground">
          勾起來的才會加進首頁和統計的「全部」。悠遊卡通常是用現金或金融卡儲值的，一起算會重複，建議不要勾。
        </p>
        <div className="stagger flex flex-col gap-1.5 px-4 py-4">
          {options.map(o => {
            const included = !draft.has(o.key)
            return (
              <button
                key={o.key}
                onClick={() => toggle(o.key)}
                role="checkbox"
                aria-checked={included}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                  included ? 'border-brand bg-brand-soft' : 'hover:bg-muted/50',
                )}
              >
                <span className="text-lg">{o.emoji}</span>
                <span className="flex-1 font-medium">{o.name}</span>
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-md border transition-colors',
                    included ? 'border-brand bg-brand text-brand-foreground' : 'border-muted-foreground/30',
                  )}
                >
                  {included && <CheckIcon className="size-3.5" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 border-t p-3">
          <button onClick={() => onOpenChange(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/50">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
          >
            {saving ? '儲存中…' : '完成'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
