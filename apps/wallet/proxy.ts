import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { renewSessionIfStale } from '@yiwallet/auth/session'
import { PUBLIC_PATHS } from '@/lib/site'

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')
  const { pathname } = request.nextUrl

  // 介紹網站：沒登入也看得到（Google 才收錄得到）；已登入的人打開首頁直接進 App
  if (PUBLIC_PATHS.includes(pathname)) {
    if (pathname === '/' && session) return NextResponse.redirect(new URL('/dashboard', request.url))
    return NextResponse.next()
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  // 有在用就自動續期，不會每 7 天被登出一次
  const response = NextResponse.next()
  await renewSessionIfStale(request, response)
  return response
}

export const config = {
  // robots.txt、sitemap.xml、分享預覽圖、網站圖示、介紹頁用的截圖都不用登入，搜尋引擎跟 LINE／FB 才抓得到
  matcher: ['/((?!login|register|forgot-password|api|_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|robots\\.txt|sitemap\\.xml|opengraph-image|manifest\\.webmanifest|sw\\.js|offline|icons/|marketing/).*)'],
}
