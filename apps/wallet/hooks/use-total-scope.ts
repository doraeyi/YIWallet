'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Card, Transaction } from '@/lib/types'

// 首頁／統計「全部」要加總哪些付款方式，由使用者自己勾選（存在後端 users.total_excluded，
// 換裝置也一樣）。存的是「排除」清單：'cash' 或卡片 id，新加的卡預設就會被計入。
// 沒設定過（null）時預設排除悠遊卡：悠遊卡的錢是從現金／金融卡儲值進去的，
// 儲值那筆已經算過支出，搭車扣款再算一次就重複了。
export const CASH_KEY = 'cash'

export function useTotalScope(cards: Card[]) {
  const [saved, setSaved] = useState<string[] | null | undefined>(undefined)

  useEffect(() => {
    fetch('/api/backend/users/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        let list: string[] | null = null
        try { list = d?.total_excluded ? JSON.parse(d.total_excluded) : null } catch {}
        setSaved(Array.isArray(list) ? list : null)
      })
      .catch(() => setSaved(null))
  }, [])

  const excluded = useMemo(() => {
    if (saved) return new Set(saved)
    return new Set(cards.filter(c => c.type === 'easycard').map(c => c.id))
  }, [saved, cards])

  const setExcluded = useCallback(async (next: Set<string>) => {
    const list = [...next]
    setSaved(list)
    const res = await fetch('/api/backend/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total_excluded: JSON.stringify(list) }),
    })
    if (!res.ok) throw new Error('Failed to save total scope')
  }, [])

  const filter = useCallback(
    <T extends Pick<Transaction, 'cardId'>>(txs: T[]): T[] =>
      txs.filter(tx => !excluded.has(tx.cardId ?? CASH_KEY)),
    [excluded],
  )

  return { excluded, setExcluded, filter, isLoaded: saved !== undefined }
}
