import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { parseAny, type PaymentType } from '@/lib/line-parser'
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

async function reply(replyToken: string, messages: object[]) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
  if (!res.ok) {
    const errText = await res.text()
    console.error('[LINE reply error]', res.status, errText)
  }
}

async function replyText(replyToken: string, text: string) {
  await reply(replyToken, [{ type: 'text', text }])
}

// ── Card helpers ──────────────────────────────────────────────────

interface LineCard {
  id: string
  name: string
  type: 'debit' | 'credit' | 'easycard'
  last_four?: string | null
  bank?: string | null
}

async function fetchUserCards(token: string): Promise<LineCard[]> {
  try {
    const res = await fetch(`${BACKEND}/cards`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function assignCard(token: string, txId: string, cardId: string | null): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND}/transactions/${txId}/card`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ card_id: cardId }),
    })
    return res.ok || res.status === 204
  } catch {
    return false
  }
}

function cardLabel(card: LineCard): string {
  if (card.type === 'easycard') {
    const last = card.last_four ?? (/^\d{4,}$/.test(card.name) ? card.name.slice(-4) : undefined)
    return last ? `🚌 悠遊卡(${last})` : '🚌 悠遊卡'
  }
  const emoji = card.type === 'credit' ? '💳' : '🏧'
  const bank = card.bank ?? card.name
  const suffix = card.last_four ? ` ${card.last_four}` : ''
  return `${emoji} ${bank}${suffix}`.slice(0, 20)
}

interface TxMeta { note: string; amount: number; date: string }

function txMetaSuffix(m: TxMeta) {
  return `:${encodeURIComponent(m.note)}:${m.amount}:${m.date}`
}

// 建立選卡 quickReply items（含現金選項）
function buildCardItems(txId: string, cards: LineCard[], meta: TxMeta) {
  const suffix = txMetaSuffix(meta)
  const items: object[] = [
    {
      type: 'action',
      action: { type: 'postback', label: '💵 現金', data: `card:assign:${txId}:cash${suffix}`, displayText: '現金' },
    },
    ...cards.slice(0, 12).map(card => ({
      type: 'action',
      action: {
        type: 'postback',
        label: cardLabel(card),
        data: `card:assign:${txId}:${card.id}${suffix}`,
        displayText: card.name,
      },
    })),
  ]
  return items
}

// 依付款類型決定要展示的訊息；autoAssigned 是自動綁定的卡（供 receipt 顯示支付方式用）
// needsSelection = true 代表需要用戶選卡，此時不應立即顯示 receipt
async function buildCardMessages(
  token: string,
  txId: string,
  paymentType: PaymentType | undefined,
  cards: LineCard[],
  meta: TxMeta,
): Promise<{ messages: object[]; autoAssigned?: LineCard | 'cash'; needsSelection: boolean }> {
  if (paymentType === 'cash') {
    return { messages: [], autoAssigned: 'cash', needsSelection: false }
  }

  if (paymentType === 'debit' || paymentType === 'credit') {
    const filtered = cards.filter(c => c.type === paymentType)
    const typeName = paymentType === 'debit' ? '金融卡' : '信用卡'

    if (filtered.length === 0) {
      return { messages: [{ type: 'text', text: `尚未設定${typeName}，請到易記帳新增卡片。` }], needsSelection: false }
    }
    if (filtered.length === 1) {
      await assignCard(token, txId, filtered[0].id)
      return { messages: [], autoAssigned: filtered[0], needsSelection: false }
    }
    return {
      messages: [{
        type: 'text',
        text: `選哪張${typeName}？`,
        quickReply: { items: buildCardItems(txId, filtered, meta) },
      }],
      needsSelection: true,
    }
  }

  if (cards.length === 0) return { messages: [], needsSelection: false }

  const suffix = txMetaSuffix(meta)
  if (cards.length <= 3) {
    return {
      messages: [{
        type: 'text',
        text: '記到哪裡？',
        quickReply: { items: buildCardItems(txId, cards, meta) },
      }],
      needsSelection: true,
    }
  }

  return {
    messages: [{
      type: 'text',
      text: '記到哪裡？',
      quickReply: {
        items: [
          { type: 'action', action: { type: 'postback', label: '💵 現金', data: `card:assign:${txId}:cash${suffix}`, displayText: '現金' } },
          { type: 'action', action: { type: 'postback', label: '🏧 金融卡', data: `card:ask:${txId}:debit${suffix}`, displayText: '金融卡' } },
          { type: 'action', action: { type: 'postback', label: '💳 信用卡', data: `card:ask:${txId}:credit${suffix}`, displayText: '信用卡' } },
        ],
      },
    }],
    needsSelection: true,
  }
}

// ── Flex messages ─────────────────────────────────────────────────

function infoRow(label: string, value: string) {
  return {
    type: 'box', layout: 'horizontal',
    contents: [
      { type: 'text', text: label, color: '#6B7280', size: 'sm', flex: 2 },
      { type: 'text', text: value, size: 'sm', flex: 5, wrap: true, color: '#111827' },
    ],
  }
}

interface PaymentInfo {
  typeName: string   // 現金 / 信用卡 / 金融卡 / 悠遊卡
  lastFour?: string
}

function cardToPaymentInfo(card: LineCard): PaymentInfo {
  const typeName = card.type === 'credit' ? '信用卡' : card.type === 'easycard' ? '悠遊卡' : '金融卡'
  // last_four 優先；若無則從卡片名稱（如悠遊卡卡號）取末四碼
  const lastFour = card.last_four ?? (/^\d{4,}$/.test(card.name) ? card.name.slice(-4) : undefined)
  return { typeName, lastFour }
}

function buildReceiptFlex(merchant: string, amount: number, note: string, date: string, payment?: PaymentInfo) {
  const rows: object[] = [
    infoRow('商家', merchant),
    ...(note && note !== merchant ? [infoRow('備註', note)] : []),
    infoRow('日期', date),
    ...(payment ? [infoRow('支付方式', payment.typeName)] : []),
    ...(payment?.lastFour ? [infoRow('卡號', `**** ${payment.lastFour}`)] : []),
  ]

  return {
    type: 'flex',
    altText: `✅ 記帳成功 ${merchant} $${amount}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#10B981', paddingAll: 'md',
        contents: [{ type: 'text', text: '✅ 記帳成功', color: '#ffffff', weight: 'bold', size: 'sm' }],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: 'lg', spacing: 'md',
        contents: [
          { type: 'text', text: `$${amount.toLocaleString()}`, weight: 'bold', size: '3xl', color: '#111827' },
          { type: 'separator' },
          { type: 'box', layout: 'vertical', spacing: 'sm', contents: rows },
        ],
      },
    },
  }
}


// ── Event type ────────────────────────────────────────────────────

interface LineEvent {
  type: string
  replyToken?: string
  source: { userId: string }
  message?: { type: string; text: string }
  postback?: { data: string }
}

// ── Main handler ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifySignature(bodyText, signature)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  let body: { events: LineEvent[] }
  try {
    body = JSON.parse(bodyText)
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  for (const event of body.events) {
    if (!event.replyToken) continue
    const lineUserId = event.source.userId

    // ── Postback：選卡 ──────────────────────────────────────────
    if (event.type === 'postback' && event.postback?.data) {
      const parts = event.postback.data.split(':')
      if (parts[0] !== 'card') continue

      const token = await getTokenForLineUser(lineUserId)
      if (!token) continue

      // card:assign:{txId}:{cardId|cash}:{note}:{amount}:{date}
      if (parts[1] === 'assign') {
        const txId = parts[2]
        const cardPart = parts[3]
        const cardId = cardPart === 'cash' ? null : cardPart
        const meta: TxMeta = {
          note: decodeURIComponent(parts[4] ?? ''),
          amount: Number(parts[5] ?? 0),
          date: parts[6] ?? '',
        }

        await assignCard(token, txId, cardId)

        let payment: PaymentInfo
        if (cardId === null) {
          payment = { typeName: '現金' }
        } else {
          const cards = await fetchUserCards(token)
          const card = cards.find(c => c.id === cardId)
          payment = card ? cardToPaymentInfo(card) : { typeName: '卡片' }
        }

        await reply(event.replyToken, [buildReceiptFlex(meta.note, meta.amount, meta.note, meta.date, payment)])
        continue
      }

      // card:ask:{txId}:{debit|credit}:{note}:{amount}:{date}
      if (parts[1] === 'ask') {
        const txId = parts[2]
        const filterType = parts[3] as 'debit' | 'credit'
        const meta: TxMeta = {
          note: decodeURIComponent(parts[4] ?? ''),
          amount: Number(parts[5] ?? 0),
          date: parts[6] ?? '',
        }
        const cards = await fetchUserCards(token)
        const filtered = cards.filter(c => c.type === filterType)
        const typeName = filterType === 'debit' ? '金融卡' : '信用卡'

        if (filtered.length === 0) {
          await replyText(event.replyToken, `尚未設定${typeName}，請到易記帳新增卡片。`)
        } else if (filtered.length === 1) {
          await assignCard(token, txId, filtered[0].id)
          await reply(event.replyToken, [buildReceiptFlex(meta.note, meta.amount, meta.note, meta.date, cardToPaymentInfo(filtered[0]))])
        } else {
          await reply(event.replyToken, [{
            type: 'text',
            text: `選哪張${typeName}？`,
            quickReply: { items: buildCardItems(txId, filtered, meta) },
          }])
        }
        continue
      }

      continue
    }

    // ── Message：記帳 ───────────────────────────────────────────
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    const text = event.message.text.trim()

    // /link CODE
    const linkMatch = text.match(/^\/link\s+([A-F0-9]{6})$/i)
    if (linkMatch) {
      const ok = await confirmLink(linkMatch[1].toUpperCase(), lineUserId)
      await replyText(
        event.replyToken,
        ok
          ? '✅ 帳號綁定成功！\n之後直接傳消費記錄給我就好了 😊\n\n範例：\n「全家 茶葉蛋 10」\n「星巴克 拿鐵 信用卡 165」\n「捷運 金融卡 28」'
          : '❌ 綁定碼無效或已過期，請回易記帳設定頁重新產生。',
      )
      continue
    }

    if (text === '/myid') {
      await replyText(event.replyToken, `你的 LINE User ID：\n${lineUserId}`)
      continue
    }

    const token = await getTokenForLineUser(lineUserId)
    if (!token) {
      await replyText(
        event.replyToken,
        '⚠️ 尚未綁定易記帳帳號\n\n請到易記帳「設定 → LINE Bot」產生綁定碼，再傳：\n/link 綁定碼',
      )
      continue
    }

    const parsed = parseAny(text)
    if (!parsed) {
      await replyText(
        event.replyToken,
        '❌ 無法辨識格式\n\n範例：\n「全家 茶葉蛋 10」\n「星巴克 拿鐵 信用卡 165」\n「捷運 金融卡 28」',
      )
      continue
    }

    try {
      const res = await fetch(`${BACKEND}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: 'expense',
          amount: parsed.amount,
          category_id: parsed.suggestedCategory,
          note: parsed.note,
          date: parsed.date,
          card_id: null,
        }),
      })

      if (!res.ok) {
        await replyText(event.replyToken, `⚠️ 記帳失敗（${res.status}）\n可能是登入已過期，請到易記帳重新綁定。`)
        continue
      }

      const txData = await res.json()
      const txId: string = txData.id

      // 通知 pending
      fetch(`${BACKEND}/line/pending/increment?line_user_id=${encodeURIComponent(lineUserId)}`, {
        method: 'POST',
      }).catch(() => {})

      // 取得使用者卡片
      const cards = await fetchUserCards(token)

      const meta: TxMeta = { note: parsed.merchant, amount: parsed.amount, date: parsed.date }
      const { messages: cardMessages, autoAssigned, needsSelection } = await buildCardMessages(token, txId, parsed.paymentType, cards, meta)

      const payment: PaymentInfo | undefined = autoAssigned === 'cash'
        ? { typeName: '現金' }
        : autoAssigned ? cardToPaymentInfo(autoAssigned)
        : undefined

      let messages: object[]
      if (needsSelection) {
        messages = cardMessages
      } else {
        messages = [
          buildReceiptFlex(parsed.merchant, parsed.amount, parsed.note, parsed.date, payment),
          ...cardMessages,
        ]
      }

      await reply(event.replyToken, messages.slice(0, 5))
    } catch {
      await replyText(event.replyToken, '⚠️ 無法連線至後端，請確認 App 伺服器運行中。')
    }
  }

  return new NextResponse('OK', { status: 200 })
}
