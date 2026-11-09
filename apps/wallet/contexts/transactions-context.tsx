'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { setCustomCategories, type Transaction } from '@/lib/types'
import * as api from '@/lib/api'
import { useRefreshOnResume } from '@/hooks/use-refresh-on-resume'
import { toast } from '@/lib/toast'
import {
  enqueue, flushQueue, isLocalId, isOffline, lastOwner, queueFor, rememberOwner, removeQueued,
  shouldQueue, toTransaction, updateQueued, type QueuedTx,
} from '@/lib/offline-queue'

// 以前預算只存在這台手機的 localStorage；現在存伺服器（LINE 預算提醒、Siri 才用得到），
// 第一次載入時如果伺服器還沒有、手機裡有，就搬上去
const LEGACY_BUDGET_KEY = 'yiwallet_budget'

const RETRY_MS = 30000
const SAVE_TIMEOUT_MS = 8000

interface TransactionsContextValue {
  transactions: Transaction[]
  budget: number
  isLoaded: boolean
  year: number
  setYear: (year: number) => void
  month: number
  setMonth: (month: number) => void
  prevMonth: () => void
  nextMonth: () => void
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<Transaction>
  updateTransaction: (id: string, data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  setBudget: (value: number) => void
  refetch: () => Promise<void>
  highlightId: string | null // 剛記好／剛改好的那一筆，列表上閃一下
  pendingCount: number  // 離線記的、還在等補送
  rejectedCount: number // 伺服器拒收、要使用者處理
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budget, setBudgetState] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  // 離線排隊的紀錄：確定是哪個帳號之後才載入，換帳號不會看到別人的
  const [owner, setOwner] = useState<string | null>(null)
  const [queued, setQueued] = useState<QueuedTx[]>([])

  const prevMonth = useCallback(() => {
    setMonth(m => {
      if (m === 1) { setYear(y => y - 1); return 12 }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setMonth(m => {
      if (m === 12) { setYear(y => y + 1); return 1 }
      return m + 1
    })
  }, [])

  useEffect(() => {
    api.fetchMe().then(me => {
      rememberOwner(me.id)
      setOwner(me.id)
      let legacy = 0
      try { legacy = Number(localStorage.getItem(LEGACY_BUDGET_KEY)) || 0 } catch {}
      if (me.monthlyBudget) {
        setBudgetState(me.monthlyBudget)
      } else if (legacy > 0) {
        setBudgetState(legacy)
        api.updateMonthlyBudget(legacy).catch(() => {})
      }
      try { localStorage.removeItem(LEGACY_BUDGET_KEY) } catch {}
    }).catch(() => setOwner(lastOwner()))
  }, [])

  const refetch = useCallback(async () => {
    setIsLoaded(false)
    // 自訂分類先登記好再放交易進來，列表第一次畫就認得自訂分類
    Promise.all([
      api.fetchAllTransactions(),
      api.fetchCategories().then(setCustomCategories).catch(() => {}),
    ])
      .then(([txs]) => setTransactions(txs))
      .catch((err) => console.error('fetchAllTransactions failed:', err)) // 抓不到就留著現有的，別把畫面清空
      .finally(() => setIsLoaded(true))
  }, [])

  useEffect(() => { refetch() }, [])

  const syncQueued = useCallback(async () => {
    if (!owner) return
    const result = await flushQueue(owner)
    setQueued(queueFor(owner))
    if (!result) return
    if (result.synced.length > 0) {
      setTransactions(prev => {
        const ids = new Set(prev.map(t => t.id))
        return [...result.synced.filter(t => !ids.has(t.id)), ...prev]
      })
      toast(`離線記的 ${result.synced.length} 筆已同步`)
    }
    if (result.rejected > 0) toast(`有 ${result.rejected} 筆送不出去，點開那筆修改或刪除`, 'error')
  }, [owner])

  useEffect(() => {
    if (!owner) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 登入的帳號要等 API 回來才知道，只能在這裡載入
    setQueued(queueFor(owner))
    syncQueued()
    window.addEventListener('online', syncQueued)
    return () => window.removeEventListener('online', syncQueued)
  }, [owner, syncQueued])

  // online 事件不可靠（訊號很差時也算有網路），還有排隊的就定時再試
  const hasWaiting = queued.some(q => !q.rejected)
  useEffect(() => {
    if (!hasWaiting) return
    const timer = setInterval(syncQueued, RETRY_MS)
    return () => clearInterval(timer)
  }, [hasWaiting, syncQueued])

  // 回到前景時默默重抓，不切回載入中（畫面不會閃骨架），抓到再換掉；
  // 先補送再抓，排隊的那筆才不會跟伺服器上的同時出現
  const refreshSilently = useCallback(() => {
    syncQueued().then(() => api.fetchAllTransactions()).then(setTransactions).catch(() => {})
  }, [syncQueued])
  useRefreshOnResume(refreshSilently)

  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlight = useCallback((id: string) => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    setHighlightId(id)
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1800)
  }, [])

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    const saveLocally = (maybeSent: boolean) => {
      const item = enqueue(owner!, data, transactions, maybeSent)
      setQueued(queueFor(owner!))
      highlight(item.localId)
      return toTransaction(item)
    }
    // 明確沒網路就不用等，一定沒送出去
    if (owner && isOffline()) return saveLocally(false)
    try {
      const tx = await api.createTransaction(data, { timeoutMs: SAVE_TIMEOUT_MS })
      setTransactions(prev => [tx, ...prev])
      highlight(tx.id)
      return tx
    } catch (err) {
      if (!owner || !shouldQueue(err)) throw err
      return saveLocally(true)
    }
  }, [highlight, owner, transactions])

  const updateTransaction = useCallback(async (id: string, data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (isLocalId(id)) {
      updateQueued(id, data)
      if (owner) setQueued(queueFor(owner))
      highlight(id)
      return
    }
    // 卡片要走另一支 API（會順便調整新舊卡片的餘額），先改卡片再改其他欄位，
    // PATCH 回來的就是卡片也更新過的完整資料
    const old = transactions.find(t => t.id === id)
    const cardChanged = (data.cardId ?? null) !== (old?.cardId ?? null)
    const becameCash = !data.cardId && !!data.isCash && !old?.isCash
    if (cardChanged || becameCash) await api.setTransactionCard(id, data.cardId ?? null)
    const tx = await api.updateTransaction(id, data)
    setTransactions(prev => prev.map(t => t.id === id ? tx : t))
    highlight(id)
  }, [transactions, highlight, owner])

  const deleteTransaction = useCallback(async (id: string) => {
    if (isLocalId(id)) {
      removeQueued(id)
      if (owner) setQueued(queueFor(owner))
      return
    }
    await api.deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [owner])

  const setBudget = useCallback((value: number) => {
    setBudgetState(value)
    api.updateMonthlyBudget(value).catch(() => {})
  }, [])

  const allTransactions = useMemo(() => [...queued.map(toTransaction), ...transactions], [queued, transactions])
  const rejectedCount = queued.filter(q => q.rejected).length

  return (
    <TransactionsContext.Provider value={{
      transactions: allTransactions, budget, isLoaded, year, setYear, month, setMonth, prevMonth, nextMonth,
      addTransaction, updateTransaction, deleteTransaction, setBudget, refetch, highlightId,
      pendingCount: queued.length - rejectedCount, rejectedCount,
    }}>
      {children}
    </TransactionsContext.Provider>
  )
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider')
  return ctx
}
