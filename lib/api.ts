import type { Transaction, Card, Friendship, FriendUser, JobShare, FriendShift, AdminUser } from './types'

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
  credit_account_id?: number | null
}

function normalizeCard(c: ApiCard): Card {
  return {
    id: c.id,
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
    creditAccountId: c.credit_account_id != null ? String(c.credit_account_id) : undefined,
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
      credit_account_id: data.creditAccountId ? Number(data.creditAccountId) : null,
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
}

function normalizeJob(j: ApiJob): Job {
  return { ...j, id: String(j.id), presets: j.presets.map(p => ({ ...p, id: String(p.id) })) }
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/jobs`)
  if (!res.ok) throw new Error('Failed to fetch jobs')
  const data: ApiJob[] = await res.json()
  return data.map(normalizeJob)
}

export async function createJob(data: Omit<Job, 'id' | 'created_at' | 'presets'>): Promise<Job> {
  const res = await fetch(`${API}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create job')
  return normalizeJob(await res.json())
}

export async function updateJob(id: string, data: Omit<Job, 'id' | 'created_at' | 'presets'>): Promise<Job> {
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

export interface BankCreditSummary {
  bank_name: string
  credit_limit: number
  billing_day: number | null
  last_closing_date: string | null
  current_period_spend: number
  available_credit: number
  unpaid_bills: BankBill[]
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

// ── Job sharing ───────────────────────────────────────────────────

interface ApiJobShare {
  id: string
  shared_with: ApiUser
}

export async function fetchJobShares(jobId: string): Promise<JobShare[]> {
  const res = await fetch(`${API}/jobs/${jobId}/shares`)
  if (!res.ok) throw new Error('Failed to fetch job shares')
  const data: ApiJobShare[] = await res.json()
  return data.map(s => ({ id: s.id, sharedWith: normalizeUser(s.shared_with) }))
}

export async function addJobShare(jobId: string, friendId: string): Promise<void> {
  const res = await fetch(`${API}/jobs/${jobId}/shares/${friendId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to add job share')
}

export async function removeJobShare(jobId: string, friendId: string): Promise<void> {
  const res = await fetch(`${API}/jobs/${jobId}/shares/${friendId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to remove job share')
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
  created_at: string
}

function normalizeAdminUser(u: ApiAdminUser): AdminUser {
  return { id: u.id, email: u.email, displayName: u.display_name, canUseOcr: u.can_use_ocr, createdAt: u.created_at }
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

// ── 銀行通知截圖（LINE 轉傳的簡訊/App 通知截圖，待確認記帳）──────────────

export interface PendingBankScreenshot {
  id: string
  createdAt: string
}

export function bankScreenshotImageUrl(id: string): string {
  return `${API}/bank-notify/pending/${id}/image`
}

export async function fetchPendingBankScreenshots(): Promise<PendingBankScreenshot[]> {
  const res = await fetch(`${API}/bank-notify/pending`)
  if (!res.ok) throw new Error('Failed to fetch pending bank screenshots')
  const data: { id: number; created_at: string }[] = await res.json()
  return data.map(s => ({ id: String(s.id), createdAt: s.created_at }))
}

export async function dismissBankScreenshot(id: string): Promise<void> {
  const res = await fetch(`${API}/bank-notify/pending/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Failed to dismiss screenshot')
}
