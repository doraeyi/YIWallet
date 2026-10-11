import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { renewSessionIfStale } from '@yiwallet/auth/session'

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  // 有在用就自動續期，不會每 7 天被登出一次
  const response = NextResponse.next()
  await renewSessionIfStale(request, response)
  return response
}

export const config = {
  matcher: ['/((?!login|register|forgot-password|api|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|offline|icons/).*)'],
}
