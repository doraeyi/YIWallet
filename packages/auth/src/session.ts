import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

const key = new TextEncoder().encode(process.env.SESSION_SECRET!)
const COOKIE = 'session'

// 登入維持 90 天，而且每隔 3 天會在背景自動換新（renewSessionIfStale），
// 有在用就等於不會過期，連續 90 天沒打開才要重新登入。
// iPhone 主畫面上的每個 App（易記帳、工具）各自有獨立的 cookie，各自要登入一次，
// 所以登入撐得越久，工具那邊越少被要求重新登入。
const SESSION_DAYS = 90
const RENEW_AFTER_MS = 3 * 24 * 60 * 60 * 1000

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    expires: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    path: '/',
    // 生產環境設成 .doraeyi.com，讓 wallet 跟 sop 兩個子網域共用同一張登入 cookie；本機開發不設（localhost 無法用 dot-domain cookie）
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  }
}

async function sign(token: string, userId: string): Promise<string> {
  return new SignJWT({ token, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key)
}

export async function createSession(token: string, userId: string) {
  const jar = await cookies()
  jar.set(COOKIE, await sign(token, userId), cookieOptions())
}

export async function verifySession(): Promise<{ token: string; userId: string } | null> {
  const jar = await cookies()
  const value = jar.get(COOKIE)?.value
  if (!value) return null

  try {
    const { payload } = await jwtVerify(value, key)
    return { token: payload.token as string, userId: payload.userId as string }
  } catch {
    return null
  }
}

export async function deleteSession() {
  const jar = await cookies()
  jar.delete({
    name: COOKIE,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  })
}

// 給各 app 的 proxy.ts 用：登入超過 3 天就跟後端換一張新的、再延長 90 天。
// 舊版發的 cookie 沒有 iat（簽發時間），一律當成該換了，順便升級成 90 天。
// 後端說憑證已經失效（401）就把 cookie 清掉，下次換頁會被導去登入頁，
// 不會卡在「看起來有登入、其實什麼都讀不到」的狀態。
export async function renewSessionIfStale(request: NextRequest, response: NextResponse): Promise<void> {
  const value = request.cookies.get(COOKIE)?.value
  if (!value) return

  let payload: { token?: unknown; userId?: unknown; iat?: number }
  try {
    payload = (await jwtVerify(value, key)).payload
  } catch {
    return
  }
  const issuedAt = (payload.iat ?? 0) * 1000
  if (Date.now() - issuedAt < RENEW_AFTER_MS) return

  try {
    const res = await fetch(`${process.env.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${payload.token}` },
    })
    if (res.status === 401) {
      response.cookies.set(COOKIE, '', { ...cookieOptions(), expires: new Date(0) })
      return
    }
    if (!res.ok) return
    const { access_token: token } = await res.json()
    response.cookies.set(COOKIE, await sign(token, String(payload.userId)), cookieOptions())
  } catch {
    // 後端連不到就下次再換，這次照常放行
  }
}
