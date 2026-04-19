import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const BACKEND = process.env.API_URL!

export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ count: 0 })

  try {
    const res = await fetch(`${BACKEND}/line/pending/count`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
    if (!res.ok) return NextResponse.json({ count: 0 })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ count: 0 })
  }
}

export async function DELETE() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ ok: false })

  await fetch(`${BACKEND}/line/pending/count`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.token}` },
  }).catch(() => {})
  return NextResponse.json({ ok: true })
}
