import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { buildSignature, encryptCard, guessCategory, parseInvoiceDate, type InvoiceItem } from '@/lib/invoice-utils'

const EINVOICE_URL = 'https://www-vc.einvoice.nat.gov.tw/BIZAPIVAN/biz'

interface RawInvoice {
  rowNum: number
  invoiceNumber: string
  cardType: string
  cardNo: string
  sellerName: string
  invStatus: string
  invDonateNo: string
  sellerBan: string
  sellerAddress: string | null
  invoiceDate: string
  amount: string
}

async function fetchPage(
  appId: string,
  apiKey: string,
  aesKey: string,
  cardNo: string,
  cardVerify: string,
  startDate: string,
  endDate: string,
  page: number,
): Promise<{ details: RawInvoice[]; hasMore: string; resCode: string; resMsg: string }> {
  const timeStamp = String(Math.floor(Date.now() / 1000))
  const uuid = crypto.randomUUID()

  const params: Record<string, string> = {
    action: 'qryCarrierInv',
    version: '0.5',
    cardType: '3J0002',
    cardNo,
    cardEncrypt: encryptCard(cardVerify, aesKey),  // 加密驗證碼，非條碼本身
    startDate,
    endDate,
    onlyWinningInv: 'N',
    uuid,
    appID: appId,
    timeStamp,
    p: String(page),
  }
  params.signature = buildSignature(params, apiKey)

  const body = new URLSearchParams(params)
  const res = await fetch(EINVOICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  return res.json()
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appId = process.env.EINVOICE_APP_ID
  const apiKey = process.env.EINVOICE_API_KEY
  const aesKey = process.env.EINVOICE_AES_KEY

  if (!appId || !apiKey || !aesKey) {
    return NextResponse.json({ error: '尚未設定財政部 API 金鑰' }, { status: 503 })
  }

  let cardNo: string
  let cardVerify: string
  let startDate: string
  let endDate: string

  try {
    const body = await req.json()
    cardNo = body.cardNo
    cardVerify = body.cardVerify   // 驗證碼（密碼），用於 AES 加密
    startDate = body.startDate     // YYYY-MM-DD
    endDate = body.endDate         // YYYY-MM-DD
    if (!cardNo || !cardVerify || !startDate || !endDate) throw new Error()
  } catch {
    return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
  }

  // 財政部 API 需要 MM/DD/YYYY 格式
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${m}/${day}/${y}`
  }
  const apiStart = fmtDate(startDate)
  const apiEnd = fmtDate(endDate)

  try {
    const allInvoices: RawInvoice[] = []
    let page = 0
    let hasMore = true

    while (hasMore && page <= 10) {
      const data = await fetchPage(appId, apiKey, aesKey, cardNo, cardVerify, apiStart, apiEnd, page)

      if (data.resCode !== '200') {
        const errorMsg: Record<string, string> = {
          '902': '驗證碼錯誤，請確認手機條碼格式',
          '903': 'AppID 不存在',
          '909': '簽名驗證失敗',
          '915': '查詢區間不可超過 30 天',
        }
        return NextResponse.json(
          { error: errorMsg[data.resCode] ?? `財政部 API 錯誤（${data.resCode}）` },
          { status: 502 },
        )
      }

      if (data.details?.length) {
        allInvoices.push(...data.details)
      }
      hasMore = data.hasMore === 'Y'
      page++
    }

    const invoices: InvoiceItem[] = allInvoices.map(inv => ({
      invoiceNo: inv.invoiceNumber,
      date: parseInvoiceDate(inv.invoiceDate),
      sellerName: inv.sellerName ?? inv.sellerBan,
      amount: Number(inv.amount),
      suggestedCategory: guessCategory(inv.sellerName ?? ''),
    }))

    return NextResponse.json({ invoices })
  } catch (err) {
    console.error('[invoice/sync]', err)
    return NextResponse.json({ error: '查詢失敗，請稍後再試' }, { status: 500 })
  }
}
