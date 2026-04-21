import type { Transaction, Card } from './types'

const API = '/api/backend'

// ── Transactions ──────────────────────────────────────────────────

interface ApiTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category_id: string
  note: string
  date: string
  created_at: string
  card_id?: string | null
}

function normalizeTransaction(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    category: t.category_id,
    note: t.note,
    date: typeof t.date === 'string' ? t.date.slice(0, 10) : String(t.date),
    createdAt: t.created_at,
    cardId: t.card_id ?? undefined,
  }
}

export async function fetchTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const res = await fetch(`${API}/transactions?year=${year}&month=${month}`)
  if (!res.ok) throw new Error('Failed to fetch transactions')
  const data: ApiTransaction[] = await res.json()
  return data.map(normalizeTransaction)
}

export async function fetchAllTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API}/transactions`)
  if (!res.ok) throw new Error('Failed to fetch transactions')
  const data: ApiTransaction[] = await res.json()
  return data.map(normalizeTransaction)
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
      card_id: data.cardId ?? null,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create transaction (${res.status}): ${err}`)
  }
  return normalizeTransaction(await res.json())
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
      card_id: data.cardId ?? null,
    }),
  })
  if (!res.ok) throw new Error('Failed to update transaction')
  return normalizeTransaction(await res.json())
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`${API}/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete transaction')
}

export async function setTransactionCard(txId: string, cardId: string | null): Promise<void> {
  const res = await fetch(`${API}/transactions/${txId}/card`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_id: cardId }),
  })
  if (!res.ok && res.status !== 204) throw new Error('Failed to update card')
}

// ── Cards ─────────────────────────────────────────────────────────

interface ApiCard {
  id: string
  name: string
  type: 'debit' | 'credit' | 'easycard'
  color: string
  last_four?: string | null
  bank_code?: string | null
  bank?: string | null
  balance?: number | null
  pass_expiry_date?: string | null
  payment_due_date?: string | null
}

function normalizeCard(c: ApiCard): Card {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    color: c.color,
    lastFour: c.last_four ?? undefined,
    bankCode: c.bank_code ?? undefined,
    bank: c.bank ?? undefined,
    balance: c.balance ?? undefined,
    passExpiryDate: c.pass_expiry_date ?? undefined,
    paymentDueDate: c.payment_due_date ?? undefined,
  }
}

export async function fetchCards(): Promise<Card[]> {
  const res = await fetch(`${API}/cards`)
  if (!res.ok) throw new Error('Failed to fetch cards')
  const data: ApiCard[] = await res.json()
  return data.map(normalizeCard)
}

export async function createCard(data: Omit<Card, 'id'>): Promise<Card> {
  const res = await fetch(`${API}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      type: data.type,
      color: data.color,
      last_four: data.lastFour ?? null,
      bank_code: data.bankCode ?? null,
      bank: data.bank ?? null,
      balance: data.balance ?? null,
      pass_expiry_date: data.passExpiryDate ?? null,
      payment_due_date: data.paymentDueDate ?? null,
    }),
  })
  if (!res.ok) throw new Error('Failed to create card')
  return normalizeCard(await res.json())
}

export async function updateCard(id: string, data: Omit<Card, 'id'>): Promise<Card> {
  const res = await fetch(`${API}/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      type: data.type,
      color: data.color,
      last_four: data.lastFour ?? null,
      bank_code: data.bankCode ?? null,
      bank: data.bank ?? null,
      balance: data.balance ?? null,
      pass_expiry_date: data.passExpiryDate ?? null,
      payment_due_date: data.paymentDueDate ?? null,
    }),
  })
  if (!res.ok) throw new Error('Failed to update card')
  return normalizeCard(await res.json())
}

export async function deleteCard(id: string): Promise<void> {
  const res = await fetch(`${API}/cards/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete card')
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
