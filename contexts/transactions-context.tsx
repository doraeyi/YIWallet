'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Transaction } from '@/lib/types'
import * as api from '@/lib/api'

const BUDGET_KEY = 'yiwallet_budget'

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
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budget, setBudgetState] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

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
    const b = localStorage.getItem(BUDGET_KEY)
    setBudgetState(b ? Number(b) : 0)
  }, [])

  const refetch = useCallback(async () => {
    setIsLoaded(false)
    api.fetchAllTransactions()
      .then(setTransactions)
      .catch((err) => {
        console.error('fetchAllTransactions failed:', err)
        setTransactions([])
      })
      .finally(() => setIsLoaded(true))
  }, [])

  useEffect(() => { refetch() }, [])

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    const tx = await api.createTransaction(data)
    setTransactions(prev => [tx, ...prev])
    return tx
  }, [])

  const updateTransaction = useCallback(async (id: string, data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const tx = await api.updateTransaction(id, data)
    setTransactions(prev => prev.map(t => t.id === id ? tx : t))
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    await api.deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  const setBudget = useCallback((value: number) => {
    setBudgetState(value)
    localStorage.setItem(BUDGET_KEY, String(value))
  }, [])

  return (
    <TransactionsContext.Provider value={{
      transactions, budget, isLoaded, year, setYear, month, setMonth, prevMonth, nextMonth,
      addTransaction, updateTransaction, deleteTransaction, setBudget, refetch,
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
