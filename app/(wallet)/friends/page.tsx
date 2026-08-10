'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, UserPlusIcon, ChevronRightIcon } from 'lucide-react'
import * as api from '@/lib/api'
import type { Friendship } from '@/lib/types'

export default function FriendsPage() {
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => { load() }, [])

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

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:mx-auto lg:w-full lg:max-w-lg lg:pt-8">
        <Link href="/schedule" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">好友</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:max-w-lg lg:px-6">
        {/* 加好友 */}
        <div className="flex gap-2">
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            type="email"
            placeholder="輸入對方 email 加好友"
            className="flex-1 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
          />
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            <UserPlusIcon className="size-4" />
            {sending ? '送出中…' : '邀請'}
          </button>
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
              return (
                <div key={f.id} className={i > 0 ? 'border-t' : ''}>
                  {isAccepted ? (
                    <Link
                      href={`/friends/${f.friend.id}/schedule`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-400/15">
                        {letter}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.friend.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{f.friend.email}</p>
                      </div>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                        {letter}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.friend.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">{f.incoming ? '想加你好友' : '等待對方接受'}</p>
                      </div>
                      {f.incoming && (
                        <button
                          onClick={() => handleAccept(f.id)}
                          className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
                        >
                          接受
                        </button>
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
