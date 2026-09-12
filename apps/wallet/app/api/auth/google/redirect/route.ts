import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { generateState, generateCodeVerifier } from 'arctic'
import { google } from '@/lib/oauth'

export async function GET(req: NextRequest) {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile'])

  const jar = await cookies()
  const isProd = process.env.NODE_ENV === 'production'

  jar.set('google_oauth_state', state, {
    httpOnly: true,
    secure: isProd,
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  })
  jar.set('google_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: isProd,
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  })

  // 從 sop app 被導來登入時帶著 return_to，登入完 callback 那邊要導回去
  const returnTo = req.nextUrl.searchParams.get('return_to')
  if (returnTo) {
    jar.set('google_return_to', returnTo, {
      httpOnly: true,
      secure: isProd,
      maxAge: 600,
      path: '/',
      sameSite: 'lax',
    })
  }

  redirect(url.toString())
}
