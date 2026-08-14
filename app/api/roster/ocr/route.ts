import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const runtime = 'nodejs'

interface OcrSpaceWord {
  WordText: string
  Left: number
  Top: number
  Height: number
  Width: number
}

interface OcrSpaceLine {
  Words?: OcrSpaceWord[]
}

interface OcrSpaceParsedResult {
  ParsedText?: string
  TextOverlay?: { Lines?: OcrSpaceLine[] }
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[]
  IsErroredOnProcessing?: boolean
  ErrorMessage?: string | string[]
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: '尚未設定 OCR_SPACE_API_KEY' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const image = body?.image
  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: '缺少圖片資料' }, { status: 400 })
  }

  const form = new URLSearchParams()
  form.set('base64Image', image)
  form.set('language', 'cht')
  form.set('isOverlayRequired', 'true')
  form.set('OCREngine', '2')
  form.set('scale', 'true')

  const ocrRes = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: apiKey,
    },
    body: form,
  })

  if (!ocrRes.ok) {
    const text = await ocrRes.text().catch(() => '')
    return NextResponse.json({ error: `OCR 服務錯誤：${text}` }, { status: 502 })
  }

  const data: OcrSpaceResponse = await ocrRes.json()
  if (data.IsErroredOnProcessing) {
    const msg = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join('; ') : data.ErrorMessage
    return NextResponse.json({ error: msg || 'OCR 辨識失敗' }, { status: 502 })
  }

  const result = data.ParsedResults?.[0]
  const rawText: string = result?.ParsedText ?? ''

  // OCR.space 的「Line」是依空間位置分群的文字行，中文常常逐字切成獨立 Word，
  // 拼字串時不加空格，不然中文名字/句子中間會被塞進不該有的空白。
  const lines: { text: string; box: { left: number; top: number; right: number; bottom: number } }[] = []
  for (const line of result?.TextOverlay?.Lines ?? []) {
    const words = line.Words ?? []
    if (words.length === 0) continue
    const text = words.map(w => w.WordText).join('')
    const lefts = words.map(w => w.Left)
    const tops = words.map(w => w.Top)
    const rights = words.map(w => w.Left + w.Width)
    const bottoms = words.map(w => w.Top + w.Height)
    lines.push({
      text,
      box: { left: Math.min(...lefts), top: Math.min(...tops), right: Math.max(...rights), bottom: Math.max(...bottoms) },
    })
  }

  return NextResponse.json({ lines, rawText })
}
