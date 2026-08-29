'use client'

import { useState } from 'react'
import { Trash2Icon, UserPlusIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import * as api from '@/lib/api'
import type { Job, JobShare, Friendship } from '@/lib/types'

interface JobCoworkersDialogProps {
  job: Job | null
  shares: JobShare[]
  friends: Friendship[]
  onOpenChange: (open: boolean) => void
  onChanged: () => void
  /** 只有工作真正的擁有者能授權/收回別人管理同事名單的權限，被授權管理的人
   * 自己打開這個彈窗時看不到、也不能再往下授權給別人。 */
  canGrantManage?: boolean
  /** 工作擁有者的顯示名稱，讓被授權管理的人也看得到「誰是最高權限」——
   * 如果自己就是擁有者（canGrantManage）就直接顯示「你」，不用傳這個。 */
  ownerName?: string
}

export function JobCoworkersDialog({ job, shares, friends, onOpenChange, onChanged, canGrantManage = false, ownerName }: JobCoworkersDialogProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleRemove(friendId: string) {
    if (!job || busyId) return
    setBusyId(friendId)
    try {
      await api.removeJobShare(job.id, friendId)
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  async function handleAdd(friendId: string) {
    if (!job || busyId) return
    setBusyId(friendId)
    try {
      await api.addJobShare(job.id, friendId)
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  async function handleManageChange(friendId: string, canManage: boolean) {
    if (!job || busyId) return
    setBusyId(friendId)
    try {
      await api.setJobShareManage(job.id, friendId, canManage)
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  const sharedIds = new Set(shares.map(s => s.sharedWith.id))
  const candidates = friends.filter(f => f.status === 'accepted' && !sharedIds.has(f.friend.id))
  const ownerLabel = canGrantManage ? '你' : (ownerName ?? '工作擁有者')

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogTitle className="text-base font-semibold">{job?.name} 的同事</DialogTitle>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-white">
              {ownerLabel.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="flex-1 truncate text-sm">{ownerLabel}</span>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              最高權限
            </span>
          </div>

          {shares.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">還沒有分享給任何人</p>
          ) : (
            shares.map(share => (
              <div key={share.id} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
                  {share.sharedWith.displayName.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="flex-1 truncate text-sm">{share.sharedWith.displayName}</span>
                {canGrantManage && (
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-[10px] text-muted-foreground">管理權限</span>
                    <Switch
                      checked={share.canManage}
                      onCheckedChange={v => handleManageChange(share.sharedWith.id, v)}
                      disabled={busyId === share.sharedWith.id}
                    />
                  </div>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={busyId === share.sharedWith.id}
                      className="shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>不再共用給「{share.sharedWith.displayName}」？</AlertDialogTitle>
                      <AlertDialogDescription>
                        對方將不再看得到這份工作的班表，此操作可以之後再重新新增。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => handleRemove(share.sharedWith.id)}>移除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>

        {candidates.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">新增同事</p>
            {candidates.map(f => (
              <Button
                key={f.friend.id}
                variant="ghost"
                onClick={() => handleAdd(f.friend.id)}
                disabled={busyId === f.friend.id}
                className="h-auto justify-start gap-2.5 rounded-xl px-1 py-1.5 text-left font-normal"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {f.friend.displayName.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="flex-1 truncate text-sm">{f.friend.displayName}</span>
                <UserPlusIcon className="size-4 shrink-0 text-muted-foreground" />
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
