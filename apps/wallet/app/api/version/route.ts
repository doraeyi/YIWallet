import { NextResponse } from 'next/server'
import { APP_VERSION, BUILD_ID, CHANGELOG } from '@/lib/version'

export const dynamic = 'force-dynamic'

// 更新提示用：舊版 App 問「伺服器上現在是哪一版、改了什麼」
export function GET() {
  return NextResponse.json(
    { version: APP_VERSION, build: BUILD_ID, changes: CHANGELOG },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
