import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { google } from '@/lib/oauth'
import { createSession, verifySession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const jar = await cookies()
  const savedState = jar.get('google_oauth_state')?.value
  const codeVerifier = jar.get('google_code_verifier')?.value
  const mode = jar.get('google_oauth_mode')?.value // 'link' or undefined

  if (!code || !state || !savedState || !codeVerifier || state !== savedState) {
    redirect(mode === 'link' ? '/settings?error=google_failed' : '/login?error=google_failed')
  }

  let accessToken: string
  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier)
    accessToken = tokens.accessToken()
  } catch {
    redirect(mode === 'link' ? '/settings?error=google_failed' : '/login?error=google_failed')
  }

  const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!userRes.ok) redirect(mode === 'link' ? '/settings?error=google_failed' : '/login?error=google_failed')

  const googleUser = await userRes.json() as {
    sub: string; email: string; name: string; picture?: string
  }

  // 清除暫時 cookie
  jar.delete('google_oauth_state')
  jar.delete('google_code_verifier')
  jar.delete('google_oauth_mode')

  // ── 綁定模式：把 google_id 綁到當前已登入的帳號 ──
  if (mode === 'link') {
    const session = await verifySession()
    if (!session) redirect('/login')

    const res = await fetch(`${process.env.API_URL}/users/me/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ google_id: googleUser.sub, google_name: googleUser.name, google_picture: googleUser.picture }),
    })

    if (!res.ok) redirect('/settings?error=google_taken')

    // 同時把 Google 的名稱和大頭照同步到使用者資料
    await fetch(`${process.env.API_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        name: googleUser.name,
        picture: googleUser.picture,
      }),
    }).catch(() => {})

    redirect('/settings?success=google_linked')
  }

  // ── 登入模式：換 backend token，建 session ──
  const backendRes = await fetch(`${process.env.API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      google_id: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    }),
  })
  if (!backendRes.ok) redirect('/login?error=google_failed')

  const { token, user } = await backendRes.json()
  await createSession(token, String(user?.id ?? user?.username ?? googleUser.email))
  redirect('/dashboard')
}
