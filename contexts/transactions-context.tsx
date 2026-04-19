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
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  updateTransaction: (id: string, data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  setBudget: (value: number) => void
  refetch: () => Promise<void>
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budget, setBudgetState] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const b = localStorage.getItem(BUDGET_KEY)
    setBudgetState(b ? Number(b) : 0)
  }, [])

  const refetch = useCallback(async () => {
    setIsLoaded(false)
    api.fetchAllTransactions()
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setIsLoaded(true))
  }, [])

  useEffect(() => { refetch() }, [])

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const tx = await api.createTransaction(data)
    setTransactions(prev => [tx, ...prev])
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
      transactions, budget, isLoaded, year, setYear,
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
