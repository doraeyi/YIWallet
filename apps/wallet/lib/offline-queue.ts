import * as api from './api'
import type { Transaction } from './types'

// 離線記帳：送不出去的紀錄先存在這台手機，連上線再補送。
// 存在 localStorage 而且標記是誰記的，換帳號登入時不會送到別人的帳號。

type TxData = Omit<Transaction, 'id' | 'createdAt'>

export interface QueuedTx {
  localId: string
  owner: string
  queuedAt: string
  data: TxData
  // 排隊當下帳上已經有的「一模一樣的紀錄」，補送前比對時要排除
  seenIds: string[]
  // 可能已經送到伺服器（回應在路上掉了）。後端沒有防重複的機制，補送前要先查一次
  maybeSent: boolean
  // 伺服器明確拒收（例如那張卡刪了），重送也沒用，等使用者改或刪
  rejected?: boolean
}

const QUEUE_KEY = 'yiwallet_offline_queue'
const OWNER_KEY = 'yiwallet_last_user_id'
const LOCK_NAME = 'yiwallet_offline_sync'
export const LOCAL_ID_PREFIX = 'local-'
export const isLocalId = (id: string) => id.startsWith(LOCAL_ID_PREFIX)

function readAll(): QueuedTx[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') } catch { return [] }
}

// 寫不進去（空間滿、私密模式）要讓呼叫的人知道，不能假裝存好了
function writeAll(items: QueuedTx[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
}

function patch(localId: string, change: Partial<QueuedTx>) {
  writeAll(readAll().map(q => (q.localId === localId ? { ...q, ...change } : q)))
}

export function removeQueued(localId: string) {
  writeAll(readAll().filter(q => q.localId !== localId))
}

export function queueFor(owner: string): QueuedTx[] {
  return readAll().filter(q => q.owner === owner)
}

export function rememberOwner(id: string) {
  try { localStorage.setItem(OWNER_KEY, id) } catch {}
}

export function lastOwner(): string | null {
  try { return localStorage.getItem(OWNER_KEY) } catch { return null }
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** 這個錯誤是連不上（值得排隊補送），還是伺服器明確拒絕 */
export function shouldQueue(err: unknown): boolean {
  if (err instanceof api.ApiError) return err.status >= 500 || err.status === 408 || err.status === 429
  return err instanceof TypeError || (err instanceof DOMException && err.name === 'AbortError')
}

const sameRecord = (t: Transaction, d: TxData) =>
  t.type === d.type && t.amount === d.amount && t.category === d.category && t.date === d.date
  && (t.note ?? '').trim() === (d.note ?? '').trim() && (t.cardId ?? '') === (d.cardId ?? '')

export function enqueue(owner: string, data: TxData, known: Transaction[], maybeSent: boolean): QueuedTx {
  const item: QueuedTx = {
    localId: `${LOCAL_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    owner,
    queuedAt: new Date().toISOString(),
    data,
    seenIds: known.filter(t => sameRecord(t, data)).map(t => t.id),
    maybeSent,
  }
  writeAll([...readAll(), item])
  return item
}

export function updateQueued(localId: string, data: TxData) {
  // 內容改了就當成新的一筆：之前可能送出去的那筆由補送時比對處理
  patch(localId, { data, rejected: false })
}

export function toTransaction(q: QueuedTx): Transaction {
  return { ...q.data, id: q.localId, createdAt: q.queuedAt, pending: true }
}

export interface FlushResult {
  synced: Transaction[]
  rejected: number
}

async function flush(owner: string): Promise<FlushResult> {
  const result: FlushResult = { synced: [], rejected: 0 }
  const items = queueFor(owner).filter(q => !q.rejected)
  if (items.length === 0) return result

  // 有「可能已送出」的才需要先抓帳上最新的資料來比對
  const server = items.some(q => q.maybeSent) ? await api.fetchAllTransactions({ fresh: true }) : []
  const matched = new Set<string>()

  for (const item of items) {
    if (item.maybeSent) {
      const hit = server.find(t => sameRecord(t, item.data) && !item.seenIds.includes(t.id) && !matched.has(t.id))
      if (hit) {
        matched.add(hit.id)
        removeQueued(item.localId)
        result.synced.push(hit)
        continue
      }
    }
    // 送之前先標記：萬一送到一半 App 被關掉，下次會先查再送，不會多記一筆
    patch(item.localId, { maybeSent: true })
    let tx: Transaction
    try {
      tx = await api.createTransaction(item.data, { timeoutMs: 15000 })
    } catch (err) {
      if (err instanceof api.ApiError && !shouldQueue(err) && err.status !== 401) {
        patch(item.localId, { rejected: true, maybeSent: false })
        result.rejected++
        continue
      }
      break // 還是連不上，或登入過期：剩下的下次再送
    }
    // 送出的這段時間使用者可能刪掉或改了這筆：撤掉剛送的，改過的留著下次送新內容
    const current = queueFor(owner).find(q => q.localId === item.localId)
    if (!current || JSON.stringify(current.data) !== JSON.stringify(item.data)) {
      await api.deleteTransaction(tx.id).catch(() => {})
      if (current) patch(item.localId, { maybeSent: false })
      continue
    }
    removeQueued(item.localId)
    result.synced.push(tx)
  }
  return result
}

let flushing = false

/** 把這個帳號排隊中的紀錄送出去；別的分頁或另一次呼叫正在送就回傳 null */
export async function flushQueue(owner: string): Promise<FlushResult | null> {
  if (flushing || isOffline()) return null
  flushing = true
  try {
    if (!navigator.locks) return await flush(owner)
    return await navigator.locks.request(LOCK_NAME, { ifAvailable: true }, lock => (lock ? flush(owner) : null))
  } catch {
    return null // 比對用的資料抓不到，下次再試
  } finally {
    flushing = false
  }
}

// 這幾支 GET 的回應 service worker 會留一份給離線時用（見 app/sw.js/route.ts）
const CACHED_API = ['/api/backend/transactions', '/api/backend/cards', '/api/backend/users/me', '/api/backend/categories']

/** 登出前清掉快取的帳務資料，排隊中的紀錄留著，同一個人登入回來會補送 */
export async function clearCachedAccountData() {
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      await Promise.all(CACHED_API.map(path => cache.delete(path)))
    }
  } catch {}
}
