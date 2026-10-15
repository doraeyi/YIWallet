'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { HandCoinsIcon, XIcon } from 'lucide-react'
import * as api from '@/lib/api'
import { confirmDialog } from '@/lib/confirm'
import { formatCurrency } from '@/lib/finance-utils'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

// 好友頁的分帳：誰還欠我、我還欠誰。在記帳紀錄點開一筆支出 →「跟好友分帳」就會出現在這裡；
// 收到錢（或自己還了）按一下，對方會收到通知。沒有任何分帳紀錄就整塊不顯示。
export function SplitsPanel() {
  const [splits, setSplits] = useState<api.Split[] | null>(null)
  const [showSettled, setShowSettled] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api.fetchSplits().then(setSplits).catch(() => setSplits([]))
  }, [])

  if (!splits || splits.length === 0) return null

  const open = splits.filter(s => !s.settled_at)
  const settled = splits.filter(s => s.settled_at)
  const owedToMe = open.filter(s => s.direction === 'owed_to_me').reduce((sum, s) => sum + s.amount, 0)
  const iOwe = open.filter(s => s.direction === 'i_owe').reduce((sum, s) => sum + s.amount, 0)

  async function settle(s: api.Split) {
    setBusy(s.id)
    try {
      const updated = await api.settleSplit(s.id)
      setSplits(prev => prev?.map(x => (x.id === s.id ? updated : x)) ?? null)
      toast(s.direction === 'owed_to_me' ? `已通知${s.friend.name}：收到了` : `已通知${s.friend.name}：你還了`)
    } catch {
      toast('沒有成功，請再試一次', 'error')
    } finally {
      setBusy(null)
    }
  }

  async function remove(s: api.Split) {
    if (!(await confirmDialog(`刪除跟${s.friend.name}的這筆分帳？`, { confirmText: '刪除', danger: true }))) return
    await api.deleteSplit(s.id).catch(() => toast('刪除失敗', 'error'))
    setSplits(prev => prev?.filter(x => x.id !== s.id) ?? null)
  }

  const row = (s: api.Split, idx: number) => {
    const mine = s.direction === 'owed_to_me'
    return (
      <div key={s.id} className={cn('flex items-center gap-3 px-4 py-3', idx > 0 && 'border-t', s.settled_at && 'opacity-60')}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {mine ? `${s.friend.name} 欠你` : `你欠 ${s.friend.name}`}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {s.description}{s.created_at && `・${format(parseISO(s.created_at), 'M/d')}`}{s.settled_at && '・已結清'}
          </p>
        </div>
        <p className={cn('shrink-0 text-sm font-semibold tabular-nums', mine ? 'text-emerald-600' : 'text-rose-500')}>
          {formatCurrency(s.amount)}
        </p>
        {!s.settled_at && (
          <button
            onClick={() => settle(s)}
            disabled={busy === s.id}
            className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/70 disabled:opacity-50"
          >
            {mine ? '收到了' : '我還了'}
          </button>
        )}
        {mine && (
          <button onClick={() => remove(s)} aria-label="刪除這筆分帳" className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><HandCoinsIcon className="size-4 text-brand-text" />分帳</p>
        <p className="text-xs text-muted-foreground">
          {owedToMe > 0 && <>別人欠你 <b className="text-emerald-600">{formatCurrency(owedToMe)}</b></>}
          {owedToMe > 0 && iOwe > 0 && '・'}
          {iOwe > 0 && <>你欠 <b className="text-rose-500">{formatCurrency(iOwe)}</b></>}
          {owedToMe === 0 && iOwe === 0 && '都結清了'}
        </p>
      </div>
      {open.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">{open.map(row)}</div>
      )}
      {settled.length > 0 && (
        <>
          <button onClick={() => setShowSettled(v => !v)} className="self-start px-1 text-xs font-medium text-brand-text">
            {showSettled ? '收起已結清的' : `已結清 ${settled.length} 筆`}
          </button>
          {showSettled && <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">{settled.map(row)}</div>}
        </>
      )}
    </div>
  )
}
