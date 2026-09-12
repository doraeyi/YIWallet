import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session')
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!login|register|api|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|offline|icons/).*)'],
}
