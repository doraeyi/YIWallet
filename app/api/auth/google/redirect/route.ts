import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { generateState, generateCodeVerifier } from 'arctic'
import { google } from '@/lib/oauth'

export async function GET() {
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

  redirect(url.toString())
}
