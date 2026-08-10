'use client'

import { createWorker } from 'tesseract.js'
import type { OcrLine } from './roster-parser'

export interface RosterOcrResult {
  lines: OcrLine[]
  rawText: string
}

/** 完全在瀏覽器裡跑（WASM），不上傳圖片給任何伺服器，不需要 API key/帳單 */
export async function runRosterOcrClient(
  imageDataUrl: string,
  onProgress?: (status: string, progress: number) => void,
): Promise<RosterOcrResult> {
  // 順序有影響：chi_tra 放第一個會導致語言包路徑組錯（tesseract.js 已知怪癖），
  // eng 放前面才能正常載入 chi_tra。
  const worker = await createWorker(['eng', 'chi_tra'], undefined, {
    logger: m => onProgress?.(m.status, m.progress),
  })
  try {
    const { data } = await worker.recognize(imageDataUrl, {}, { blocks: true, text: true })
    const lines: OcrLine[] = []
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          const text = line.text.trim()
          if (!text) continue
          lines.push({
            text,
            box: { left: line.bbox.x0, top: line.bbox.y0, right: line.bbox.x1, bottom: line.bbox.y1 },
          })
        }
      }
    }
    return { lines, rawText: data.text }
  } finally {
    await worker.terminate()
  }
}
