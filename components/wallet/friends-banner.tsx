'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserPlusIcon } from 'lucide-react'
import * as api from '@/lib/api'
import type { Friendship } from '@/lib/types'

export function FriendsBanner() {
  const [friendships, setFriendships] = useState<Friendship[]>([])

  useEffect(() => {
    api.fetchFriendships().then(setFriendships).catch(() => setFriendships([]))
  }, [])

  const accepted = friendships.filter(f => f.status === 'accepted')

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
      <p className="px-4 pt-3.5 text-xs font-semibold tracking-wide text-muted-foreground">好友</p>
      <div className="flex gap-3.5 overflow-x-auto px-4 py-2.5 scrollbar-none">
        {accepted.map(f => {
          const letter = f.friend.displayName.charAt(0).toUpperCase() || '?'
          return (
            <Link
              key={f.id}
              href={`/friends/${f.friend.id}/schedule?name=${encodeURIComponent(f.friend.displayName)}`}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600 dark:bg-indigo-400/15">
                {letter}
              </div>
              <span className="w-full truncate text-center text-[11px]">{f.friend.displayName}</span>
            </Link>
          )
        })}
        <Link href="/friends" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserPlusIcon className="size-5" />
          </div>
          <span className="w-full truncate text-center text-[11px] text-muted-foreground">加好友</span>
        </Link>
      </div>
    </div>
  )
}
