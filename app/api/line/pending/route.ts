import { NextResponse } from 'next/server'
import { getPending, clearPending } from '@/lib/line-pending'

export async function GET() {
  return NextResponse.json({ count: getPending() })
}

export async function DELETE() {
  clearPending()
  return NextResponse.json({ ok: true })
}
