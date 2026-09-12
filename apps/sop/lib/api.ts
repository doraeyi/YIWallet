import type { MeProfile, Job, JobShare, Friendship, FriendUser, Product, ProductInput, ProductImportResult, ProductDeal, XuhanKeyword } from './types'

const API = '/api/backend'

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

// ── Jobs（只給砍貨專區的工作選單/協作者管理用，唯讀）──────────────────

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

export async function fetchSharedJobs(): Promise<Job[]> {
  const res = await fetch(`${API}/jobs/shared-with-me`)
  if (!res.ok) throw new Error('Failed to fetch shared jobs')
  const data: ApiJob[] = await res.json()
  return data.map(normalizeJob)
}

// ── Friends / Job sharing（砍貨專區協作者管理用）──────────────────────

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

// ── 手順查詢（爬自 xuhan.app，需要 can_use_barcode 權限）──────────────────

interface ApiXuhanStep {
  text: string
  image_url: string
}

interface ApiXuhanKeywordItem {
  id: string
  machine_name: string | null
  steps: ApiXuhanStep[]
  image_url: string | null
  sort_order: number
}

interface ApiXuhanKeyword {
  id: string
  title: string
  tags: string | null
  image_url: string | null
  pinned: boolean
  hidden: boolean
  items: ApiXuhanKeywordItem[]
}

function normalizeXuhanKeyword(k: ApiXuhanKeyword): XuhanKeyword {
  return {
    id: k.id,
    title: k.title,
    tags: k.tags,
    imageUrl: k.image_url,
    pinned: k.pinned,
    hidden: k.hidden,
    items: k.items.map(item => ({
      id: item.id,
      machineName: item.machine_name,
      steps: item.steps.map(s => ({ text: s.text, imageUrl: s.image_url })),
      imageUrl: item.image_url,
      sortOrder: item.sort_order,
    })),
  }
}

export async function fetchXuhanKeywords(q = ''): Promise<XuhanKeyword[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  const res = await fetch(`${API}/xuhan/keywords?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch xuhan keywords')
  const data: ApiXuhanKeyword[] = await res.json()
  return data.map(normalizeXuhanKeyword)
}

export async function triggerXuhanScrape(): Promise<{ keywords: number; items: number }> {
  const res = await fetch(`${API}/xuhan/scrape`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to scrape xuhan')
  return res.json()
}
