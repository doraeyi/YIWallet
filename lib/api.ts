import type { Transaction } from './types'

const API = '/api/backend'

interface ApiTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category_id: string
  note: string
  date: string
  created_at: string
}

function normalize(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    category: t.category_id,
    note: t.note,
    date: typeof t.date === 'string' ? t.date.slice(0, 10) : String(t.date),
    createdAt: t.created_at,
  }
}

export async function fetchTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const res = await fetch(`${API}/transactions?year=${year}&month=${month}`)
  if (!res.ok) throw new Error('Failed to fetch transactions')
  const data: ApiTransaction[] = await res.json()
  return data.map(normalize)
}

export async function fetchAllTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API}/transactions`)
  if (!res.ok) throw new Error('Failed to fetch transactions')
  const data: ApiTransaction[] = await res.json()
  return data.map(normalize)
}

export async function createTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const res = await fetch(`${API}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: data.type,
      amount: data.amount,
      category_id: data.category,
      note: data.note,
      date: data.date,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create transaction (${res.status}): ${err}`)
  }
  return normalize(await res.json())
}

export async function updateTransaction(id: string, data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const res = await fetch(`${API}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: data.type,
      amount: data.amount,
      category_id: data.category,
      note: data.note,
      date: data.date,
    }),
  })
  if (!res.ok) throw new Error('Failed to update transaction')
  return normalize(await res.json())
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`${API}/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete transaction')
}

// ── Jobs ──────────────────────────────────────────────────────────

import type { Job, Shift } from './types'

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/jobs`)
  if (!res.ok) throw new Error('Failed to fetch jobs')
  return res.json()
}

export async function createJob(data: Omit<Job, 'id' | 'created_at'>): Promise<Job> {
  const res = await fetch(`${API}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create job')
  return res.json()
}

export async function updateJob(id: string, data: Omit<Job, 'id' | 'created_at'>): Promise<Job> {
  const res = await fetch(`${API}/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update job')
  return res.json()
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`${API}/jobs/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete job')
}

// ── Shifts ────────────────────────────────────────────────────────

export async function fetchShifts(year: number, month: number): Promise<Shift[]> {
  const res = await fetch(`${API}/shifts?year=${year}&month=${month}`)
  if (!res.ok) throw new Error('Failed to fetch shifts')
  return res.json()
}

export async function upsertShift(data: { job_id: string; date: string; shift_type: 'morning' | 'evening' }): Promise<Shift> {
  const res = await fetch(`${API}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to upsert shift')
  return res.json()
}

export async function deleteShift(id: string): Promise<void> {
  const res = await fetch(`${API}/shifts/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete shift')
}
