import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { generateLinkCode, unlinkUser, getLineIdForUser } from '@/lib/line-links'

// 產生綁定碼
export async function POST() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = await generateLinkCode(session.token, session.userId)
  return NextResponse.json({ code })
}

// 查詢目前綁定狀態
export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const linked = await getLineIdForUser(session.userId, session.token)
  return NextResponse.json({ linked })
}

// 解除綁定
export async function DELETE() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await unlinkUser(session.token)
  return NextResponse.json({ ok: true })
}
