import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const runtime = 'nodejs'

interface VisionVertex {
  x?: number
  y?: number
}

interface VisionParagraph {
  boundingBox?: { vertices?: VisionVertex[] }
  words?: { symbols?: { text: string }[] }[]
}

interface VisionBlock {
  paragraphs?: VisionParagraph[]
}

interface VisionPage {
  blocks?: VisionBlock[]
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: '尚未設定 GOOGLE_VISION_API_KEY' }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const image = body?.image
  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: '缺少圖片資料' }, { status: 400 })
  }
  const base64 = image.includes(',') ? image.split(',')[1] : image

  const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: { languageHints: ['zh-Hant'] },
      }],
    }),
  })

  if (!visionRes.ok) {
    const text = await visionRes.text().catch(() => '')
    return NextResponse.json({ error: `OCR 服務錯誤：${text}` }, { status: 502 })
  }

  const data = await visionRes.json()
  const response = data.responses?.[0]
  if (response?.error) {
    return NextResponse.json({ error: response.error.message ?? 'OCR 辨識失敗' }, { status: 502 })
  }

  const fullTextAnnotation = response?.fullTextAnnotation
  const rawText: string = fullTextAnnotation?.text ?? ''

  // 用「段落」當作 Flutter 版 ML Kit TextLine 的對應單位——Vision 的段落分群
  // 一樣是靠文字間的空間距離判斷是否算同一段，對於分得開的表格儲存格通常會
  // 各自成段，跟 ML Kit 的行為相近，後續的座標分群演算法可以直接沿用。
  const lines: { text: string; box: { left: number; top: number; right: number; bottom: number } }[] = []
  const pages: VisionPage[] = fullTextAnnotation?.pages ?? []
  for (const page of pages) {
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs ?? []) {
        const text = (paragraph.words ?? [])
          .map(w => (w.symbols ?? []).map(s => s.text).join(''))
          .join(' ')
          .trim()
        if (!text) continue
        const vertices = paragraph.boundingBox?.vertices ?? []
        if (vertices.length === 0) continue
        const xs = vertices.map(v => v.x ?? 0)
        const ys = vertices.map(v => v.y ?? 0)
        lines.push({
          text,
          box: { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) },
        })
      }
    }
  }

  return NextResponse.json({ lines, rawText })
}
