import type { Transaction, Card, Friendship, FriendUser, JobShare, FriendShift, AdminUser, LineQuota, MeProfile, Product, ProductInput, ProductImportResult, ProductDeal } from './types'

const API = '/api/backend'

// ── Transactions ──────────────────────────────────────────────────

interface ApiTransaction {
  id: number
  transaction_type: 'income' | 'expense'
  amount: number
  category: string | null
  note: string | null
  transaction_date: string | null
  created_at: string
  card_id: number | null
}

function normalizeTransaction(t: ApiTransaction): Transaction {
  return {
    id: String(t.id),
    type: t.transaction_type,
    amount: Math.abs(t.amount),
    category: t.category ?? 'other-expense',
    note: t.note ?? '',
    date: t.transaction_date ?? t.created_at.slice(0, 10),
    createdAt: t.created_at,
    cardId: t.card_id != null ? String(t.card_id) : undefined,
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
      transaction_type: data.type,
      amount: data.amount,
      category: data.category,
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

// 後端只有 PATCH /transactions/{id}，且只接受 amount/category/note
// （日期、類型、卡片目前無法透過這支端點修改；卡片指定另外走 setTransactionCard）
export async function updateTransaction(id: string, data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const res = await fetch(`${API}/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: data.amount,
      category: data.category,
      note: data.note,
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
  bank?: string | null
  balance?: number | null
  due_amount?: number | null
  credit_limit?: number | null
  pass_expiry_date?: string | null
  payment_due_date?: string | null
  reminder_day?: number | null
}

function normalizeCard(c: ApiCard): Card {
  return {
    id: String(c.id),
    name: c.name,
    type: c.type,
    color: c.color,
    lastFour: c.last_four ?? undefined,
    bank: c.bank ?? undefined,
    balance: c.balance ?? undefined,
    dueAmount: c.due_amount ?? undefined,
    creditLimit: c.credit_limit ?? undefined,
    passExpiryDate: c.pass_expiry_date ?? undefined,
    paymentDueDate: c.payment_due_date ?? undefined,
    reminderDay: c.reminder_day ?? undefined,
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
      bank: data.bank ?? null,
      balance: data.balance ?? null,
      due_amount: data.dueAmount ?? null,
      credit_limit: data.creditLimit ?? null,
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
      bank: data.bank ?? null,
      balance: data.balance ?? null,
      due_amount: data.dueAmount ?? null,
      credit_limit: data.creditLimit ?? null,
      pass_expiry_date: data.passExpiryDate ?? null,
      payment_due_date: data.paymentDueDate ?? null,
      reminder_day: data.reminderDay ?? null,
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

import type { Job, Shift, ShiftPreset } from './types'

interface ApiShiftPreset {
  id: number
  label: string
  start_time: string
  end_time: string
}

interface ApiJob {
  id: number
  user_id: number
  name: string
  color: string
  pay_type: 'hourly' | 'monthly'
  hourly_rate: number | null
  monthly_salary: number | null
  payday: number
  labor_insurance_fee: number
  health_insurance_fee: number
  welfare_fee: number
  created_at: string
  presets: ApiShiftPreset[]
  can_manage: boolean
}

function normalizeJob(j: ApiJob): Job {
  return {
    ...j,
    id: String(j.id),
    userId: String(j.user_id),
    presets: j.presets.map(p => ({ ...p, id: String(p.id) })),
    canManage: j.can_manage,
  }
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/jobs`)
  if (!res.ok) throw new Error('Failed to fetch jobs')
  const data: ApiJob[] = await res.json()
  return data.map(normalizeJob)
}

export async function createJob(data: Omit<Job, 'id' | 'userId' | 'created_at' | 'presets' | 'canManage'>): Promise<Job> {
  const res = await fetch(`${API}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create job')
  return normalizeJob(await res.json())
}

export async function updateJob(id: string, data: Omit<Job, 'id' | 'userId' | 'created_at' | 'presets' | 'canManage'>): Promise<Job> {
  const res = await fetch(`${API}/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update job')
  return normalizeJob(await res.json())
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`${API}/jobs/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete job')
}

export async function addShiftPreset(jobId: string, data: { label: string; start_time: string; end_time: string }): Promise<ShiftPreset> {
  const res = await fetch(`${API}/jobs/${jobId}/presets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to add shift preset')
  const p: ApiShiftPreset = await res.json()
  return { ...p, id: String(p.id) }
}

export async function deleteShiftPreset(jobId: string, presetId: string): Promise<void> {
  const res = await fetch(`${API}/jobs/${jobId}/presets/${presetId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete shift preset')
}

// ── Shifts ────────────────────────────────────────────────────────
// 後端真正的個人班表端點掛在 /schedule（不是 /shifts，那個 router 不存在），
// 只有 GET（回傳全部，不支援年月篩選）/ POST / DELETE，沒有更新用的 PUT，
// 换班別是前端自己「先刪舊的、再建新的」。

interface ApiShift {
  id: number
  job_id: number | null
  date: string
  start_time: string
  end_time: string
  shift_type: string | null
  note: string | null
  job?: { name: string; color: string } | null
}

function normalizeShift(s: ApiShift): Shift {
  return {
    id: String(s.id),
    job_id: s.job_id != null ? String(s.job_id) : null,
    job_name: s.job?.name ?? null,
    job_color: s.job?.color ?? null,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    shift_type: s.shift_type,
    note: s.note ?? null,
  }
}

export async function fetchShifts(): Promise<Shift[]> {
  const res = await fetch(`${API}/schedule`)
  if (!res.ok) throw new Error('Failed to fetch shifts')
  const data: ApiShift[] = await res.json()
  return data.map(normalizeShift)
}

export async function upsertShift(data: { job_id: string; date: string; label: string; start_time: string; end_time: string }): Promise<Shift> {
  const res = await fetch(`${API}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: data.job_id,
      date: data.date,
      shift_type: data.label,
      start_time: data.start_time,
      end_time: data.end_time,
    }),
  })
  if (!res.ok) throw new Error('Failed to upsert shift')
  return normalizeShift(await res.json())
}

export async function deleteShift(id: string): Promise<void> {
  const res = await fetch(`${API}/schedule/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete shift')
}

// ── Roster import（排班表照片匯入）──────────────────────────────────

export interface PendingRosterPhoto {
  id: string
  created_at: string
}

export async function fetchPendingRosterPhotos(): Promise<PendingRosterPhoto[]> {
  const res = await fetch(`${API}/roster/pending`)
  if (!res.ok) throw new Error('Failed to fetch pending roster photos')
  return res.json()
}

export function pendingRosterPhotoImageUrl(id: string): string {
  return `${API}/roster/pending/${id}/image`
}

export async function deletePendingRosterPhoto(id: string): Promise<void> {
  const res = await fetch(`${API}/roster/pending/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete pending roster photo')
}

export interface RosterShiftEntry {
  employee_name: string
  date: string
  start_time: string | null
  end_time: string | null
  note: string | null
  matched_user_id?: number | null
}

export async function confirmRosterImport(params: {
  pendingId?: string
  jobId: string | null
  periodStart: string
  periodEnd: string
  shifts: RosterShiftEntry[]
}): Promise<void> {
  const path = params.pendingId ? `/roster/pending/${params.pendingId}/confirm` : '/roster/confirm'
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: params.jobId,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      shifts: params.shifts,
    }),
  })
  if (!res.ok) throw new Error('Failed to confirm roster import')
}

export interface MatchedRosterShift {
  id: string
  date: string
  startTime: string | null
  endTime: string | null
  shiftType: string | null
}

// 好友幫我上傳班表、把某一列標成「這是我本人」時，不用等我自己上傳同一份班表
export async function fetchMatchedRosterShifts(start: string, end: string): Promise<MatchedRosterShift[]> {
  const res = await fetch(`${API}/roster/shifts/matched-to-me?start=${start}&end=${end}`)
  if (!res.ok) throw new Error('Failed to fetch matched roster shifts')
  const data: { id: number; date: string; start_time: string | null; end_time: string | null; shift_type: string | null }[] = await res.json()
  return data.map(s => ({ id: String(s.id), date: s.date, startTime: s.start_time, endTime: s.end_time, shiftType: s.shift_type }))
}

export interface RosterOcrResult {
  lines: { text: string; box: { left: number; top: number; right: number; bottom: number } }[]
  rawText: string
}

export async function runRosterOcr(imageDataUrl: string): Promise<RosterOcrResult> {
  const res = await fetch('/api/roster/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'OCR 辨識失敗')
  }
  return res.json()
}

// ── 團隊班表（同一份匯入班表裡的所有同事，employee_name 是自由文字）──────────

export interface RosterViewShift {
  id: string
  employeeName: string
  date: string
  startTime: string | null
  endTime: string | null
  shiftType: string | null
  note: string | null
  matchedUserId: string | null
  materialized: boolean
}

export interface RosterUpload {
  id: string
  jobId: string | null
  job: { id: string; name: string; color: string } | null
  periodStart: string
  periodEnd: string
  createdAt: string
  shifts: RosterViewShift[]
}

interface ApiRosterShift {
  id: number
  roster_upload_id: number
  employee_name: string
  date: string
  start_time: string | null
  end_time: string | null
  shift_type: string | null
  note: string | null
  matched_user_id: number | null
  materialized: boolean
}

interface ApiRosterUpload {
  id: number
  job_id: number | null
  job: { id: number; name: string; color: string } | null
  period_start: string
  period_end: string
  created_at: string
  shifts: ApiRosterShift[]
}

function normalizeRosterShift(s: ApiRosterShift): RosterViewShift {
  return {
    id: String(s.id),
    employeeName: s.employee_name,
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
    shiftType: s.shift_type,
    note: s.note,
    matchedUserId: s.matched_user_id != null ? String(s.matched_user_id) : null,
    materialized: s.materialized,
  }
}

export async function fetchRosterUploads(): Promise<RosterUpload[]> {
  const res = await fetch(`${API}/roster/uploads`)
  if (!res.ok) throw new Error('Failed to fetch roster uploads')
  const data: ApiRosterUpload[] = await res.json()
  return data.map(u => ({
    id: String(u.id),
    jobId: u.job_id != null ? String(u.job_id) : null,
    job: u.job ? { id: String(u.job.id), name: u.job.name, color: u.job.color } : null,
    periodStart: u.period_start,
    periodEnd: u.period_end,
    createdAt: u.created_at,
    shifts: u.shifts.map(normalizeRosterShift),
  }))
}

// 事後把某一列標成／解除標成某個好友（或自己），null 代表解除標記。
export async function matchRosterShift(shiftId: string, matchedUserId: string | null): Promise<RosterViewShift> {
  const res = await fetch(`${API}/roster/shifts/${shiftId}/match`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matched_user_id: matchedUserId ? Number(matchedUserId) : null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '標註失敗')
  }
  return normalizeRosterShift(await res.json())
}

export async function updateRosterShift(shiftId: string, data: {
  employeeName: string
  date: string
  startTime: string | null
  endTime: string | null
  note: string | null
}): Promise<RosterViewShift> {
  const res = await fetch(`${API}/roster/shifts/${shiftId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employee_name: data.employeeName,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      note: data.note,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '更新失敗')
  }
  return normalizeRosterShift(await res.json())
}

export async function deleteRosterShift(shiftId: string): Promise<void> {
  const res = await fetch(`${API}/roster/shifts/${shiftId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete roster shift')
}

// ── 信用卡帳單（BankCreditSetting）──────────────────────────────────
// bankName 其實是 credit_group_key，網頁版卡片沒有「不共用額度」的切換，
// credit_group_key 一律等於 Card.bank，所以直接拿卡片的 bank 名稱當 key 就對了。

export interface BankCreditSetting {
  bank_name: string
  billing_day: number | null
  manual_period_amount: number | null
  manual_period_set_date: string | null
}

export interface BankBill {
  closing_date: string
  period_start: string
  period_end: string
  amount: number
  paid: boolean
}

export interface CardSpendBreakdown {
  card_id: number
  name: string
  color: string
  spend: number
}

export interface BankCreditSummary {
  bank_name: string
  credit_limit: number
  billing_day: number | null
  last_closing_date: string | null
  current_period_spend: number
  available_credit: number
  unpaid_bills: BankBill[]
  card_breakdown: CardSpendBreakdown[]
}

export async function fetchBankCreditSetting(bankName: string): Promise<BankCreditSetting> {
  const res = await fetch(`${API}/bank-credit-settings/${encodeURIComponent(bankName)}`)
  if (!res.ok) throw new Error('Failed to fetch bank credit setting')
  return res.json()
}

export async function updateBankCreditSetting(
  bankName: string,
  data: { billing_day: number | null; manual_period_amount?: number | null },
): Promise<BankCreditSetting> {
  const res = await fetch(`${API}/bank-credit-settings/${encodeURIComponent(bankName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update bank credit setting')
  return res.json()
}

/** 找不到這個銀行分組底下的信用卡時後端回 404，這裡轉成 null 讓呼叫端當「還沒有資料」處理 */
export async function fetchBankCreditSummary(bankName: string): Promise<BankCreditSummary | null> {
  const res = await fetch(`${API}/bank-credit-settings/${encodeURIComponent(bankName)}/summary`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch bank credit summary')
  return res.json()
}

export async function payBankCreditBill(bankName: string, closingDate: string): Promise<BankBill> {
  const res = await fetch(`${API}/bank-credit-settings/${encodeURIComponent(bankName)}/bills/${closingDate}/pay`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '標記已繳失敗')
  }
  return res.json()
}

// ── Friends ───────────────────────────────────────────────────────

interface ApiUser {
  id: string
  email: string
  display_name: string
  picture?: string | null
}

function normalizeUser(u: ApiUser): FriendUser {
  return { id: u.id, email: u.email, displayName: u.display_name, picture: u.picture ?? undefined }
}

interface ApiFriendship {
  id: string
  status: 'pending' | 'accepted'
  friend: ApiUser
  incoming: boolean
}

function normalizeFriendship(f: ApiFriendship): Friendship {
  return { id: f.id, status: f.status, friend: normalizeUser(f.friend), incoming: f.incoming }
}

export async function fetchFriendships(): Promise<Friendship[]> {
  const res = await fetch(`${API}/friends`)
  if (!res.ok) throw new Error('Failed to fetch friendships')
  const data: ApiFriendship[] = await res.json()
  return data.map(normalizeFriendship)
}

export async function requestFriend(email: string): Promise<Friendship> {
  const res = await fetch(`${API}/friends/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || '加好友失敗')
  }
  return normalizeFriendship(await res.json())
}

export async function acceptFriend(friendshipId: string): Promise<Friendship> {
  const res = await fetch(`${API}/friends/${friendshipId}/accept`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to accept friend request')
  return normalizeFriendship(await res.json())
}

// 拒絕一筆待接受的邀請、收回自己送出的邀請、或刪除一個已接受的好友——三種
// 情境後端都是刪掉同一筆 Friendship。
export async function deleteFriendship(friendshipId: string): Promise<void> {
  const res = await fetch(`${API}/friends/${friendshipId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete friendship')
}

// ── Job sharing ───────────────────────────────────────────────────

interface ApiJobShare {
  id: string
  shared_with: ApiUser
  can_manage: boolean
}

export async function fetchJobShares(jobId: string): Promise<JobShare[]> {
  const res = await fetch(`${API}/jobs/${jobId}/shares`)
  if (!res.ok) throw new Error('Failed to fetch job shares')
  const data: ApiJobShare[] = await res.json()
  return data.map(s => ({ id: s.id, sharedWith: normalizeUser(s.shared_with), canManage: s.can_manage }))
}

export async function addJobShare(jobId: string, friendId: string): Promise<void> {
  const res = await fetch(`${API}/jobs/${jobId}/shares/${friendId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to add job share')
}

export async function removeJobShare(jobId: string, friendId: string): Promise<void> {
  const res = await fetch(`${API}/jobs/${jobId}/shares/${friendId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to remove job share')
}

export async function setJobShareManage(jobId: string, friendId: string, canManage: boolean): Promise<void> {
  const res = await fetch(`${API}/jobs/${jobId}/shares/${friendId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ can_manage: canManage }),
  })
  if (!res.ok) throw new Error('Failed to update job share manage permission')
}

// ── 好友分享班表（唯讀）──────────────────────────────────────────────

interface ApiFriendShift {
  id: string
  date: string
  start_time: string
  end_time: string
  shift_type: string | null
  note: string | null
  job?: { id: string; name: string; color: string } | null
}

export async function fetchFriendShifts(friendId: string): Promise<FriendShift[]> {
  const res = await fetch(`${API}/schedule/friend/${friendId}`)
  if (!res.ok) throw new Error('Failed to fetch friend shifts')
  const data: ApiFriendShift[] = await res.json()
  return data.map(s => ({
    id: s.id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    shift_type: s.shift_type,
    note: s.note,
    job: s.job ?? null,
  }))
}

// ── Admin（管理後台，後端會擋非管理員帳號）────────────────────────────

interface ApiAdminUser {
  id: string
  email: string
  display_name: string
  can_use_ocr: boolean
  can_use_barcode: boolean
  created_at: string
}

function normalizeAdminUser(u: ApiAdminUser): AdminUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    canUseOcr: u.can_use_ocr,
    canUseBarcode: u.can_use_barcode,
    createdAt: u.created_at,
  }
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API}/admin/users`)
  if (!res.ok) throw new Error('Failed to fetch users')
  const data: ApiAdminUser[] = await res.json()
  return data.map(normalizeAdminUser)
}

export async function updateOcrPermission(userId: string, canUseOcr: boolean): Promise<AdminUser> {
  const res = await fetch(`${API}/admin/users/${userId}/ocr-permission`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ can_use_ocr: canUseOcr }),
  })
  if (!res.ok) throw new Error('Failed to update OCR permission')
  return normalizeAdminUser(await res.json())
}

export async function updateBarcodePermission(userId: string, canUseBarcode: boolean): Promise<AdminUser> {
  const res = await fetch(`${API}/admin/users/${userId}/barcode-permission`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ can_use_barcode: canUseBarcode }),
  })
  if (!res.ok) throw new Error('Failed to update barcode permission')
  return normalizeAdminUser(await res.json())
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await fetch(`${API}/admin/users/${userId}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? 'Failed to delete user')
  }
}

export async function fetchLineQuota(): Promise<LineQuota> {
  const res = await fetch('/api/line/quota')
  if (!res.ok) throw new Error('Failed to fetch LINE quota')
  return res.json()
}

// ── 目前登入使用者（含各項功能權限旗標）──────────────────────────────

interface ApiMeProfile {
  id: number
  email: string | null
  name: string | null
  picture: string | null
  can_use_ocr: boolean
  can_use_barcode: boolean
  auto_accept_shared_shifts: boolean
  dashboard_order: string | null
}

export async function fetchMe(): Promise<MeProfile> {
  const res = await fetch(`${API}/users/me`)
  if (!res.ok) throw new Error('Failed to fetch profile')
  const d: ApiMeProfile = await res.json()
  return {
    id: String(d.id),
    email: d.email,
    name: d.name,
    picture: d.picture,
    canUseOcr: d.can_use_ocr,
    canUseBarcode: d.can_use_barcode,
    autoAcceptSharedShifts: d.auto_accept_shared_shifts,
    dashboardOrder: d.dashboard_order,
  }
}

// ── 條碼查詢（商品模糊搜尋，需要 can_use_barcode 權限）──────────────────

interface ApiProduct {
  id: number
  item_no: string | null
  type: string
  code: string
  name: string
  event: string | null
}

function normalizeProduct(p: ApiProduct): Product {
  return { id: String(p.id), itemNo: p.item_no, type: p.type, code: p.code, name: p.name, event: p.event }
}

interface ApiProductImportResult {
  inserted: number
  skipped: number
  updated: number
  duplicate_item_nos: string[]
  invalid: number
  invalid_names: string[]
}

function normalizeImportResult(r: ApiProductImportResult): ProductImportResult {
  return {
    inserted: r.inserted,
    skipped: r.skipped,
    updated: r.updated,
    duplicateItemNos: r.duplicate_item_nos,
    invalid: r.invalid,
    invalidNames: r.invalid_names,
  }
}

export async function fetchProductCount(): Promise<number> {
  const res = await fetch(`${API}/products/count`)
  if (!res.ok) throw new Error('Failed to fetch product count')
  return res.json()
}

export async function searchProducts(q: string, event?: string): Promise<Product[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (event) params.set('event', event)
  const res = await fetch(`${API}/products/search?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to search products')
  const data: ApiProduct[] = await res.json()
  return data.map(normalizeProduct)
}

export async function fetchProductEvents(): Promise<string[]> {
  const res = await fetch(`${API}/products/events`)
  if (!res.ok) throw new Error('Failed to fetch product events')
  return res.json()
}

export async function createProducts(items: ProductInput[]): Promise<ProductImportResult> {
  const res = await fetch(`${API}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map(p => ({
        item_no: p.itemNo, type: p.type, code: p.code, name: p.name, event: p.event ?? null,
      })),
    }),
  })
  if (!res.ok) throw new Error('Failed to create products')
  return normalizeImportResult(await res.json())
}

export async function importProductsCsv(file: File): Promise<ProductImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API}/products/import`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error('Failed to import products')
  return normalizeImportResult(await res.json())
}

export async function fetchFavoriteProducts(): Promise<Product[]> {
  const res = await fetch(`${API}/products/favorites`)
  if (!res.ok) throw new Error('Failed to fetch favorite products')
  const data: ApiProduct[] = await res.json()
  return data.map(normalizeProduct)
}

export async function addFavoriteProduct(productId: string): Promise<void> {
  const res = await fetch(`${API}/products/${productId}/favorite`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to add favorite product')
}

export async function removeFavoriteProduct(productId: string): Promise<void> {
  const res = await fetch(`${API}/products/${productId}/favorite`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove favorite product')
}

interface ApiProductDeal {
  deal_id: number
  id: number
  item_no: string | null
  type: string
  code: string
  name: string
  event: string | null
  added_by_id: number
  added_by_name: string
  mine: boolean
}

function normalizeProductDeal(d: ApiProductDeal): ProductDeal {
  return {
    id: String(d.id), itemNo: d.item_no, type: d.type, code: d.code, name: d.name, event: d.event,
    dealId: String(d.deal_id), addedById: String(d.added_by_id), addedByName: d.added_by_name, mine: d.mine,
  }
}

export async function fetchDealProducts(jobId: string): Promise<ProductDeal[]> {
  const res = await fetch(`${API}/products/deals?job_id=${encodeURIComponent(jobId)}`)
  if (!res.ok) throw new Error('Failed to fetch deal products')
  const data: ApiProductDeal[] = await res.json()
  return data.map(normalizeProductDeal)
}

export async function addDealProduct(productId: string, jobId: string): Promise<void> {
  const res = await fetch(`${API}/products/${productId}/deal?job_id=${encodeURIComponent(jobId)}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to add deal product')
}

export async function removeDealProduct(productId: string, jobId: string): Promise<void> {
  const res = await fetch(`${API}/products/${productId}/deal?job_id=${encodeURIComponent(jobId)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to remove deal product')
}

export async function fetchSharedJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/jobs/shared-with-me`)
  if (!res.ok) throw new Error('Failed to fetch shared jobs')
  const data: ApiJob[] = await res.json()
  return data.map(normalizeJob)
}

export async function updateProduct(productId: string, patch: Partial<ProductInput>): Promise<Product> {
  const res = await fetch(`${API}/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item_no: patch.itemNo, type: patch.type, code: patch.code, name: patch.name, event: patch.event,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? 'Failed to update product')
  }
  return normalizeProduct(await res.json())
}

export async function deleteProduct(productId: string): Promise<void> {
  const res = await fetch(`${API}/products/${productId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete product')
}

// ── 銀行通知截圖（LINE 轉傳的簡訊/App 通知截圖，待確認記帳）──────────────

export interface PendingBankScreenshot {
  id: string
  createdAt: string
  ocrProcessed: boolean
  parsedAmount: number | null
  parsedLastFour: string | null
  parsedMerchant: string | null
  parsedTransactionAt: string | null
  matchedCardId: string | null
  matchedCardName: string | null
}

interface ApiPendingBankScreenshot {
  id: number
  created_at: string
  ocr_processed: boolean
  parsed_amount: number | null
  parsed_last_four: string | null
  parsed_merchant: string | null
  parsed_transaction_at: string | null
  matched_card_id: number | null
  matched_card: { name: string } | null
}

function normalizePendingBankScreenshot(s: ApiPendingBankScreenshot): PendingBankScreenshot {
  return {
    id: String(s.id),
    createdAt: s.created_at,
    ocrProcessed: s.ocr_processed,
    parsedAmount: s.parsed_amount,
    parsedLastFour: s.parsed_last_four,
    parsedMerchant: s.parsed_merchant,
    parsedTransactionAt: s.parsed_transaction_at,
    matchedCardId: s.matched_card_id != null ? String(s.matched_card_id) : null,
    matchedCardName: s.matched_card?.name ?? null,
  }
}

export function bankScreenshotImageUrl(id: string): string {
  return `${API}/bank-notify/pending/${id}/image`
}

export async function fetchPendingBankScreenshots(): Promise<PendingBankScreenshot[]> {
  const res = await fetch(`${API}/bank-notify/pending`)
  if (!res.ok) throw new Error('Failed to fetch pending bank screenshots')
  const data: ApiPendingBankScreenshot[] = await res.json()
  return data.map(normalizePendingBankScreenshot)
}

// 第一次收到截圖時 OCR 失敗就不會重試（可能是 OCR.space 那次剛好逾時/出錯），
// 讓使用者在畫面上手動點「重新辨識」對同一張截圖再跑一次。
export async function reprocessPendingScreenshot(id: string): Promise<PendingBankScreenshot> {
  const res = await fetch(`${API}/bank-notify/pending/${id}/reprocess`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to reprocess screenshot')
  return normalizePendingBankScreenshot(await res.json())
}

export async function dismissBankScreenshot(id: string): Promise<void> {
  const res = await fetch(`${API}/bank-notify/pending/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to dismiss screenshot')
}

export async function importPendingScreenshot(id: string, data: { amount: number; cardId: string | null; note: string | null; date: string | null }): Promise<void> {
  const res = await fetch(`${API}/bank-notify/pending/${id}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: data.amount,
      card_id: data.cardId,
      note: data.note,
      date: data.date,
    }),
  })
  if (!res.ok) throw new Error('Failed to import screenshot')
}
