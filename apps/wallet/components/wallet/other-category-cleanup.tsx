'use client'

import { useMemo, useState } from 'react'
import { SparklesIcon, XIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTransactions } from '@/hooks/use-transactions'
import { useCustomCategories } from '@/hooks/use-custom-categories'
import { guessCategory, merchantKey } from '@/lib/guess-category'
import { formatCurrency } from '@/lib/finance-utils'
import { pickableCategories, type Transaction } from '@/lib/types'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

// 自動記帳（LINE Pay、Apple Pay、發票）進來的支出常常沒有分類，全部堆在「其他」，
// 統計跟年度回顧就看不出錢花到哪。這裡把「其他」照店名合成一組一組，
// 認得的店先帶入建議分類，使用者確認後一次改好。

const OTHER = 'other-expense'

interface Group {
  key: string
  txs: Transaction[]
  total: number
  guess?: string
}

function useOtherGroups(transactions: Transaction[]): Group[] {
  return useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.category !== OTHER) continue
      const text = (tx.description || tx.note || '').trim()
      if (!text) continue
      const key = merchantKey(text)
      map.set(key, [...(map.get(key) ?? []), tx])
    }
    return [...map.entries()]
      .map(([key, txs]) => ({
        key,
        txs,
        total: txs.reduce((s, t) => s + t.amount, 0),
        guess: guessCategory(key) ?? guessCategory(txs.map(t => `${t.description ?? ''} ${t.note}`).join(' ')),
      }))
      .sort((a, b) => b.txs.length - a.txs.length || b.total - a.total)
  }, [transactions])
}

// 頁面上的入口：有「其他」可以整理才出現
export function OtherCategoryBanner({ className }: { className?: string }) {
  const { transactions } = useTransactions()
  const groups = useOtherGroups(transactions)
  const [open, setOpen] = useState(false)
  const count = groups.reduce((n, g) => n + g.txs.length, 0)
  if (count === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-left transition-colors hover:bg-brand-soft/70',
          className,
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <SparklesIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-brand-soft-foreground">有 {count} 筆歸在「其他」</span>
          <span className="block text-xs text-brand-soft-foreground/80">照店名一次幫它們分好類，統計才看得出錢花去哪</span>
        </span>
        <span className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground">整理</span>
      </button>
      {open && <OtherCategoryDialog groups={groups} onClose={() => setOpen(false)} />}
    </>
  )
}

function OtherCategoryDialog({ groups, onClose }: { groups: Group[]; onClose: () => void }) {
  const { updateTransaction } = useTransactions()
  const { categories: custom } = useCustomCategories()
  const options = useMemo(
    () => [...pickableCategories('expense'), ...custom.filter(c => c.type === 'expense' && !c.hidden)].filter(c => c.id !== OTHER),
    [custom],
  )
  const [picked, setPicked] = useState<Record<string, string>>(
    () => Object.fromEntries(groups.filter(g => g.guess).map(g => [g.key, g.guess!])),
  )
  const [saving, setSaving] = useState(false)
  const chosen = groups.filter(g => picked[g.key])
  const chosenCount = chosen.reduce((n, g) => n + g.txs.length, 0)

  async function apply() {
    setSaving(true)
    let done = 0
    try {
      for (const g of chosen) {
        for (const { id, createdAt: _createdAt, ...rest } of g.txs) {
          await updateTransaction(id, { ...rest, category: picked[g.key] })
          done += 1
        }
      }
      toast(`已整理 ${done} 筆`)
      onClose()
    } catch {
      toast(done > 0 ? `改好 ${done} 筆，其他的沒成功，再試一次` : '沒有改成功，再試一次', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o && !saving) onClose() }}>
      <DialogContent showCloseButton={false} className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <DialogTitle className="text-base font-semibold">整理「其他」分類</DialogTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">同一家店的紀錄會一起改；認得的店已經先幫你選好，不確定的留空就不會動</p>
          </div>
          <button onClick={onClose} disabled={saving} aria-label="關閉" className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {groups.map((g, i) => (
            <div key={g.key} className={cn('flex items-center gap-3 px-5 py-3', i > 0 && 'border-t')}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.key}</p>
                <p className="text-xs text-muted-foreground">{g.txs.length} 筆・{formatCurrency(g.total)}</p>
              </div>
              <select
                aria-label={`${g.key} 的分類`}
                value={picked[g.key] ?? ''}
                onChange={e => setPicked(p => ({ ...p, [g.key]: e.target.value }))}
                className={cn(
                  'h-9 w-32 shrink-0 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !picked[g.key] && 'text-muted-foreground',
                )}
              >
                <option value="">先不改</option>
                {options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t px-5 py-3">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/40">
            取消
          </button>
          <button
            onClick={apply}
            disabled={saving || chosenCount === 0}
            className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? '整理中…' : chosenCount > 0 ? `套用到 ${chosenCount} 筆` : '還沒選分類'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
