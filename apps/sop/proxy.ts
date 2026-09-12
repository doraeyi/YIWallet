import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// sop app 沒有自己的登入頁：沒 session cookie 時導去 wallet app 的 /login，
// 帶 return_to 讓登入完可以導回原本要去的頁面（wallet 那邊會驗證這個網址）。
export function proxy(request: NextRequest) {
  const session = request.cookies.get('session')
  if (!session) {
    const returnTo = request.nextUrl.toString()
    const url = new URL('/login', process.env.NEXT_PUBLIC_WALLET_APP_URL)
    url.searchParams.set('return_to', returnTo)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
