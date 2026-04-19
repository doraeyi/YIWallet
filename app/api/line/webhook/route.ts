import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { parseAny } from '@/lib/line-parser'
import { confirmLink, getTokenForLineUser } from '@/lib/line-links'

const BACKEND = process.env.API_URL!
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!

function verifySignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64')
  return expected === signature
}

async function replyMessage(replyToken: string, text: string) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifySignature(bodyText, signature)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  let body: { events: Array<{ type: string; replyToken?: string; source: { userId: string }; message?: { type: string; text: string } }> }
  try {
    body = JSON.parse(bodyText)
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  for (const event of body.events) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue
    if (!event.replyToken) continue

    const lineUserId = event.source.userId
    const text = event.message.text.trim()

    // 指令：/link CODE — 綁定帳號
    const linkMatch = text.match(/^\/link\s+([A-F0-9]{6})$/i)
    if (linkMatch) {
      const ok = await confirmLink(linkMatch[1].toUpperCase(), lineUserId)
      await replyMessage(
        event.replyToken,
        ok
          ? '✅ 帳號綁定成功！\n之後直接傳消費記錄給我就好了 😊\n\n範例：「全家 茶葉蛋 10」'
          : '❌ 綁定碼無效或已過期，請回易記帳設定頁重新產生。',
      )
      continue
    }

    // 指令：/myid — 查詢 LINE User ID
    if (text === '/myid') {
      await replyMessage(event.replyToken, `你的 LINE User ID：\n${lineUserId}`)
      continue
    }

    const token = await getTokenForLineUser(lineUserId)
    if (!token) {
      await replyMessage(
        event.replyToken,
        '⚠️ 尚未綁定易記帳帳號\n\n請到易記帳「設定 → LINE Bot」產生綁定碼，再傳：\n/link 綁定碼',
      )
      continue
    }

    const parsed = parseAny(text)
    if (!parsed) {
      await replyMessage(
        event.replyToken,
        '❌ 無法辨識格式\n\n範例：\n「全家 茶葉蛋 10」\n「捷運28」\n「麥當勞 大麥克 149元」',
      )
      continue
    }

    try {
      const res = await fetch(`${BACKEND}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'expense',
          amount: parsed.amount,
          category_id: parsed.suggestedCategory,
          note: parsed.note,
          date: parsed.date,
        }),
      })

      if (res.ok) {
        // 記帳成功，在 MySQL 累加此 user 的 pending count
        await fetch(`${BACKEND}/line/pending/increment?line_user_id=${encodeURIComponent(lineUserId)}`, {
          method: 'POST',
        }).catch(() => {})
        await replyMessage(event.replyToken, `✅ 已記帳\n${parsed.merchant}　${parsed.amount}$`)
      } else {
        await replyMessage(
          event.replyToken,
          `⚠️ 記帳失敗（${res.status}）\n可能是登入已過期，請到易記帳重新綁定。`,
        )
      }
    } catch {
      await replyMessage(event.replyToken, '⚠️ 無法連線至後端，請確認 App 伺服器運行中。')
    }
  }

  return new NextResponse('OK', { status: 200 })
}
