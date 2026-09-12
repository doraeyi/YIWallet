'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import * as api from '@/lib/api'
import type { Job, JobShare, FriendUser } from '@/lib/types'

interface FriendJobsDialogProps {
  friend: FriendUser | null
  jobs: Job[]
  sharesByJob: Record<string, JobShare[]>
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

// 從好友這邊直接設定「要分享我的哪個工作給他」，不用跑去設定頁的工作管理——
// 通常工作數量不會比好友多，從好友這邊一次看完比較快。
export function FriendJobsDialog({ friend, jobs, sharesByJob, onOpenChange, onChanged }: FriendJobsDialogProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function toggle(job: Job, shared: boolean) {
    if (!friend || busyId) return
    setBusyId(job.id)
    try {
      if (shared) await api.removeJobShare(job.id, friend.id)
      else await api.addJobShare(job.id, friend.id)
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Dialog open={!!friend} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogTitle className="text-base font-semibold">分享班表給 {friend?.displayName}</DialogTitle>

        {jobs.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            你還沒有新增工作，去設定頁的「工作管理」新增
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {jobs.map(job => {
              const shared = friend ? (sharesByJob[job.id] ?? []).some(s => s.sharedWith.id === friend.id) : false
              return (
                <div key={job.id} className="flex items-center gap-2.5 rounded-xl px-1 py-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: job.color }} />
                  <span className="flex-1 truncate text-sm">{job.name}</span>
                  <Switch
                    checked={shared}
                    onCheckedChange={() => toggle(job, shared)}
                    disabled={busyId === job.id}
                    className="shrink-0"
                  />
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
