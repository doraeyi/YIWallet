'use client'

import { useEffect, useState } from 'react'
import { XIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import * as api from '@/lib/api'
import type { Job, Friendship } from '@/lib/types'
import { cn } from '@/lib/utils'

interface JobShareSheetProps {
  job: Job
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JobShareSheet({ job, open, onOpenChange }: JobShareSheetProps) {
  const isDesktop = useIsDesktop()
  const [loading, setLoading] = useState(true)
  const [friends, setFriends] = useState<Friendship[]>([])
  const [sharedIds, setSharedIds] = useState<Set<string>>(new Set())
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([api.fetchFriendships(), api.fetchJobShares(job.id)])
      .then(([allFriends, shares]) => {
        setFriends(allFriends.filter(f => f.status === 'accepted'))
        setSharedIds(new Set(shares.map(s => s.sharedWith.id)))
      })
      .catch(() => { setFriends([]); setSharedIds(new Set()) })
      .finally(() => setLoading(false))
  }, [open, job.id])

  async function toggle(friendId: string, shared: boolean) {
    if (togglingId) return
    setTogglingId(friendId)
    try {
      if (shared) await api.removeJobShare(job.id, friendId)
      else await api.addJobShare(job.id, friendId)
      setSharedIds(prev => {
        const next = new Set(prev)
        if (shared) next.delete(friendId)
        else next.add(friendId)
        return next
      })
    } finally {
      setTogglingId(null)
    }
  }

  const content = (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <span className="size-3 rounded-full" style={{ backgroundColor: job.color }} />
        <span className="text-base font-semibold">{job.name} 共享設定</span>
      </div>
      <p className="text-xs text-muted-foreground">選擇哪些好友可以看到你這份工作的班表</p>

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">載入中…</p>
      ) : friends.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">還沒有已接受的好友</p>
      ) : (
        <div className="flex flex-col gap-1">
          {friends.map(f => {
            const shared = sharedIds.has(f.friend.id)
            const letter = f.friend.displayName.charAt(0).toUpperCase() || '?'
            return (
              <div key={f.friend.id} className="flex items-center gap-3 py-2">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-400/15">
                  {letter}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.friend.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{f.friend.email}</p>
                </div>
                <button
                  onClick={() => toggle(f.friend.id, shared)}
                  disabled={togglingId === f.friend.id}
                  className={cn(
                    'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
                    shared ? 'bg-indigo-500' : 'bg-muted',
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                    shared ? 'translate-x-[22px]' : 'translate-x-0.5',
                  )} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="p-0 max-w-sm overflow-y-auto max-h-[90dvh]">
          <DialogTitle className="sr-only">共享設定</DialogTitle>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <button onClick={() => onOpenChange(false)} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <XIcon className="size-4" />
            </button>
            <span className="text-base font-semibold">共享設定</span>
            <div className="size-8" />
          </div>
          {content}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl p-0 max-h-[90dvh] overflow-y-auto">
        <SheetTitle className="sr-only">共享設定</SheetTitle>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <button onClick={() => onOpenChange(false)} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <XIcon className="size-4" />
          </button>
          <span className="text-base font-semibold">共享設定</span>
          <div className="size-8" />
        </div>
        {content}
      </SheetContent>
    </Sheet>
  )
}
