'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, UsersIcon, PlusIcon, CheckIcon } from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { useProductGroups } from '@/hooks/use-product-groups'
import * as api from '@/lib/api'
import type { Friendship, ProductGroup } from '@/lib/types'
import { cn } from '@/lib/utils'

function InviteFriendPicker({ group, friends, onInvited }: { group: ProductGroup; friends: Friendship[]; onInvited: () => void }) {
  const [open, setOpen] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const memberIds = new Set(group.members.map(m => m.userId))
  const candidates = friends.filter(f => f.status === 'accepted' && !memberIds.has(f.friend.id))

  async function invite(friendUserId: string) {
    setInviting(friendUserId)
    setError('')
    try {
      await api.inviteToProductGroup(group.id, friendUserId)
      onInvited()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '邀請失敗')
    } finally {
      setInviting(null)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600"
      >
        <PlusIcon className="size-3.5" /> 邀請好友
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-muted/30 p-2.5">
      {candidates.length === 0 ? (
        <p className="text-xs text-muted-foreground">沒有可以邀請的好友了（要是還沒加的好友，或好友還沒有條碼查詢權限）</p>
      ) : (
        candidates.map(f => (
          <button
            key={f.friend.id}
            onClick={() => invite(f.friend.id)}
            disabled={inviting === f.friend.id}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
          >
            <span>{f.friend.displayName}</span>
            <span className="text-xs text-muted-foreground">{inviting === f.friend.id ? '邀請中…' : '邀請'}</span>
          </button>
        ))
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
      <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">收起</button>
    </div>
  )
}

export default function BarcodeGroupsPage() {
  const { me, loading: meLoading } = useMe()
  const { groups, loading: groupsLoading, reload } = useProductGroups()
  const [friends, setFriends] = useState<Friendship[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.fetchFriendships().then(setFriends).catch(() => setFriends([]))
  }, [])

  const pendingGroups = groups.filter(g => g.myStatus === 'pending')
  const acceptedGroups = groups.filter(g => g.myStatus === 'accepted')

  async function createGroup() {
    const name = newGroupName.trim()
    if (!name) return
    setCreating(true)
    setError('')
    try {
      await api.createProductGroup(name)
      setNewGroupName('')
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : '建立失敗')
    } finally {
      setCreating(false)
    }
  }

  async function acceptInvite(groupId: string) {
    try {
      await api.acceptProductGroupInvite(groupId)
      reload()
    } catch {
      // 安靜失敗，使用者可以再按一次
    }
  }

  if (meLoading || groupsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
    )
  }

  if (!me?.canUseBarcode) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-3xl">🔒</p>
        <p className="text-sm text-muted-foreground">你沒有條碼查詢功能的使用權限</p>
        <Link href="/settings" className="mt-2 text-xs text-amber-500 hover:text-amber-600">回設定頁</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:pt-8">
        <Link href="/barcode/deals" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="flex flex-1 items-center gap-1.5 text-xl font-bold">
          <UsersIcon className="size-5 text-sky-500" />
          砍貨群組
        </h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:px-6">
        <p className="text-xs text-muted-foreground">
          邀請已經是好友、也有條碼查詢權限的人加入群組，接受後大家在這個群組標記的商品就會混在一起看。
        </p>

        {/* 建立新群組 */}
        <div className="flex gap-2">
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="新群組名稱"
            className="flex-1 rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 dark:bg-card"
          />
          <button
            onClick={createGroup}
            disabled={creating || !newGroupName.trim()}
            className="rounded-xl bg-amber-400 px-4 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            建立
          </button>
        </div>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{error}</p>}

        {/* 待處理邀請 */}
        {pendingGroups.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">待處理邀請</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
              {pendingGroups.map((g, i) => (
                <div key={g.id} className={cn('flex items-center justify-between px-4 py-3', i > 0 && 'border-t')}>
                  <p className="text-sm font-medium">{g.name}</p>
                  <button
                    onClick={() => acceptInvite(g.id)}
                    className="flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
                  >
                    <CheckIcon className="size-3.5" /> 接受
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 我的群組 */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">我的群組</p>
          {acceptedGroups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">還沒有加入任何群組，先建立一個吧</p>
          ) : (
            <div className="flex flex-col gap-3">
              {acceptedGroups.map(g => (
                <div key={g.id} className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-card">
                  <p className="text-sm font-semibold">{g.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.members.map(m => (
                      <span
                        key={m.userId}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px]',
                          m.status === 'accepted' ? 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-400' : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {m.displayName}{m.status === 'pending' && '（待接受）'}
                      </span>
                    ))}
                  </div>
                  <InviteFriendPicker group={g} friends={friends} onInvited={reload} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
