'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import * as api from '@/lib/api'
import { formatCurrency } from '@/lib/finance-utils'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { Friendship } from '@/lib/types'

// 跟好友分這一筆：勾要分的人，預設大家平分（含自己），每個人的金額也可以改。
// 送出後對方會收到 LINE／推播，在「好友」頁可以看誰還欠、按已還。
export function SplitDialog({ open, onOpenChange, transactionId, description, total }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId?: string
  description: string
  total: number
}) {
  const [friends, setFriends] = useState<Friendship[] | null>(null)
  const [existing, setExisting] = useState<api.Split[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [includeMe, setIncludeMe] = useState(true)
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    api.fetchFriendships().then(list => setFriends(list.filter(f => f.status === 'accepted'))).catch(() => setFriends([]))
    api.fetchSplits()
      .then(list => setExisting(transactionId ? list.filter(s => s.transaction_id === transactionId && s.direction === 'owed_to_me') : []))
      .catch(() => setExisting([]))
  }, [open, transactionId])

  const each = useMemo(() => {
    const people = picked.length + (includeMe ? 1 : 0)
    return people > 0 ? Math.round(total / people) : 0
  }, [picked.length, includeMe, total])
  const amountOf = (id: string) => (custom[id] !== undefined ? Number(custom[id]) || 0 : each)

  function toggle(id: string) {
    setPicked(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]))
  }

  async function submit() {
    if (picked.length === 0 || saving) return
    const shares = picked.map(id => ({ friendId: id, amount: amountOf(id) })).filter(s => s.amount > 0)
    if (shares.length === 0) return
    setSaving(true)
    try {
      await api.createSplits({ transactionId, description, shares })
      const names = shares.map(s => friends?.find(f => f.friend.id === s.friendId)?.friend.displayName).filter(Boolean)
      toast(`已通知 ${names.join('、')}`)
      setPicked([]); setCustom({})
      onOpenChange(false)
    } catch (e) {
      toast(e instanceof Error ? e.message : '分帳失敗', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="text-base font-semibold">跟好友分這筆</DialogTitle>
        <p className="-mt-2 text-xs text-muted-foreground">{description}・{formatCurrency(total)}</p>

        {existing.length > 0 && (
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            已經分給：{existing.map(s => `${s.friend.name} ${formatCurrency(s.amount)}${s.settled_at ? '（已還）' : ''}`).join('、')}
          </div>
        )}

        {friends === null ? (
          <p className="py-6 text-center text-xs text-muted-foreground">載入中…</p>
        ) : friends.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            還沒有好友，先到<Link href="/friends" className="font-medium text-brand-text">好友頁</Link>用 email 加好友
          </p>
        ) : (
          <>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {friends.map(f => {
                const on = picked.includes(f.friend.id)
                return (
                  <div key={f.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
                    <button
                      onClick={() => toggle(f.friend.id)}
                      aria-pressed={on}
                      className="flex flex-1 items-center gap-2.5 text-left"
                    >
                      <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                        on ? 'border-brand bg-brand text-brand-foreground' : 'border-muted-foreground/30')}>
                        {on && <CheckIcon className="size-3.5" />}
                      </span>
                      <span className="truncate text-sm">{f.friend.displayName}</span>
                    </button>
                    {on && (
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          aria-label={`${f.friend.displayName} 要付多少`}
                          value={custom[f.friend.id] ?? String(each)}
                          onChange={e => setCustom(prev => ({ ...prev, [f.friend.id]: e.target.value }))}
                          className="w-full rounded-lg border bg-muted/30 py-1.5 pl-5 pr-2 text-right text-sm tabular-nums outline-none focus:border-ring"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={includeMe} onChange={e => { setIncludeMe(e.target.checked); setCustom({}) }} className="accent-(--brand)" />
              我也有份（平分時算我一份）
            </label>
            <button
              onClick={submit}
              disabled={picked.length === 0 || saving}
              className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? '送出中…' : picked.length === 0 ? '選要分的人' : `通知 ${picked.length} 人還錢`}
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
