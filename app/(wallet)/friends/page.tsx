'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, UserPlusIcon, ChevronRightIcon, XIcon, Trash2Icon, BriefcaseIcon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import * as api from '@/lib/api'
import type { Friendship, Job, JobShare, FriendUser } from '@/lib/types'
import { FriendJobsDialog } from '@/components/wallet/friend-jobs-dialog'

export default function FriendsPage() {
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 我自己的工作、跟每份工作各自的分享名單，拿來在列表顯示「他掛在哪個公司底下」，
  // 也給 FriendJobsDialog 用來切換要不要分享給某個好友
  const [myJobs, setMyJobs] = useState<Job[]>([])
  const [sharesByJob, setSharesByJob] = useState<Record<string, JobShare[]>>({})
  const [dialogFriend, setDialogFriend] = useState<FriendUser | null>(null)

  async function load() {
    setLoading(true)
    try {
      setFriendships(await api.fetchFriendships())
    } catch {
      setFriendships([])
    } finally {
      setLoading(false)
    }
  }

  async function loadJobsAndShares() {
    try {
      const jobs = await api.fetchJobs()
      const shareLists = await Promise.all(
        jobs.map(job => api.fetchJobShares(job.id).catch(() => []))
      )
      setMyJobs(jobs)
      setSharesByJob(Object.fromEntries(jobs.map((job, i) => [job.id, shareLists[i]])))
    } catch {
      setMyJobs([])
      setSharesByJob({})
    }
  }

  useEffect(() => { load(); loadJobsAndShares() }, [])

  async function handleSend() {
    if (!email.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      await api.requestFriend(email.trim())
      setEmail('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '加好友失敗')
    } finally {
      setSending(false)
    }
  }

  async function handleAccept(id: string) {
    await api.acceptFriend(id)
    await load()
  }

  async function handleReject(id: string) {
    await api.deleteFriendship(id)
    await load()
  }

  async function handleRemoveFriend(id: string) {
    await api.deleteFriendship(id)
    await load()
  }

  // 每個好友被我分享了哪些工作（公司），從 myJobs + sharesByJob 現算，不用另外存
  const jobNamesByFriend: Record<string, string[]> = {}
  for (const job of myJobs) {
    for (const share of sharesByJob[job.id] ?? []) {
      const list = jobNamesByFriend[share.sharedWith.id] ?? []
      list.push(job.name)
      jobNamesByFriend[share.sharedWith.id] = list
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:mx-auto lg:w-full lg:max-w-lg lg:pt-8">
        <Link href="/schedule" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">好友</h1>
      </div>

      <FriendJobsDialog
        friend={dialogFriend}
        jobs={myJobs}
        sharesByJob={sharesByJob}
        onOpenChange={o => { if (!o) setDialogFriend(null) }}
        onChanged={loadJobsAndShares}
      />

      <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:max-w-lg lg:px-6">
        {/* 加好友 */}
        <div className="flex gap-2">
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            type="email"
            placeholder="輸入對方 email 加好友"
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="h-auto gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
          >
            <UserPlusIcon className="size-4" />
            {sending ? '送出中…' : '邀請'}
          </Button>
        </div>
        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{error}</p>
        )}

        {/* 好友列表 */}
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">載入中…</p>
        ) : friendships.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">還沒有好友，輸入 email 邀請看看</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
            {friendships.map((f, i) => {
              const letter = f.friend.displayName.charAt(0).toUpperCase() || '?'
              const isAccepted = f.status === 'accepted'
              const jobNames = jobNamesByFriend[f.friend.id] ?? []
              return (
                <div key={f.id} className={i > 0 ? 'border-t' : ''}>
                  {isAccepted ? (
                    <div className="flex items-center gap-1 pr-2">
                      <Link
                        href={`/friends/${f.friend.id}/schedule`}
                        className="flex flex-1 items-center gap-3 px-4 py-3.5 hover:bg-muted/40"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-400/15">
                          {letter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{f.friend.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{f.friend.email}</p>
                          {jobNames.length > 0 && (
                            <p className="mt-0.5 truncate text-[11px] text-amber-600 dark:text-amber-400">
                              🏢 {jobNames.join('、')}
                            </p>
                          )}
                        </div>
                        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDialogFriend(f.friend)}
                        className="shrink-0 rounded-full text-muted-foreground"
                        title="分享班表"
                      >
                        <BriefcaseIcon className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>刪除好友「{f.friend.displayName}」？</AlertDialogTitle>
                            <AlertDialogDescription>
                              會一併移除彼此分享的班表，此操作無法復原。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => handleRemoveFriend(f.id)}>刪除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                        {letter}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.friend.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{f.incoming ? '想加你好友' : '等待對方接受'}</p>
                      </div>
                      {f.incoming ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(f.id)}
                            className="shrink-0 rounded-lg font-medium text-muted-foreground"
                          >
                            拒絕
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAccept(f.id)}
                            className="shrink-0 rounded-lg bg-amber-400 font-semibold text-white hover:bg-amber-500"
                          >
                            接受
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleReject(f.id)}
                          className="shrink-0 rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
                        >
                          <XIcon className="size-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
