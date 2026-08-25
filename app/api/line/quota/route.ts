import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const BACKEND = process.env.API_URL!
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

// 用量查詢只給管理員看，直接借用後端 /admin/users 現有的管理員檢查
async function isAdmin(token: string): Promise<boolean> {
  const res = await fetch(`${BACKEND}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.ok
}

export async function GET() {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await isAdmin(session.token))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [quotaRes, consumptionRes] = await Promise.all([
    fetch('https://api.line.me/v2/bot/message/quota', {
      headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
    }),
    fetch('https://api.line.me/v2/bot/message/quota/consumption', {
      headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
    }),
  ])

  if (!quotaRes.ok || !consumptionRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch LINE quota' }, { status: 502 })
  }

  const quota: { type: 'limited' | 'none'; value?: number } = await quotaRes.json()
  const consumption: { totalUsage: number } = await consumptionRes.json()

  return NextResponse.json({
    type: quota.type,
    limit: quota.value ?? null,
    used: consumption.totalUsage,
  })
}
