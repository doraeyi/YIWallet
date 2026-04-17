import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const key = new TextEncoder().encode(process.env.SESSION_SECRET!)
const COOKIE = 'session'

export async function createSession(token: string, userId: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const encrypted = await new SignJWT({ token, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key)

  const jar = await cookies()
  jar.set(COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires,
    path: '/',
  })
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
  jar.delete(COOKIE)
}
