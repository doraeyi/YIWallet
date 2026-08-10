/**
 * 排班表照片 OCR 猜測解析——照搬 Flutter 版 roster_table_parser.dart 的邏輯。
 *
 * 主路徑靠 OCR 回傳的每一段文字的座標（bounding box）重建表格的行列關係：
 * OCR 常把表格拆成順序錯亂的獨立段落，純文字猜測法幾乎沒用，座標是唯一還原
 * 「哪些格子在同一列、哪一欄對應哪個日期」的線索。完全找不到座標可用時才
 * 退回純文字版本當備援。不管走哪條路徑，這裡都只給一個「大概是這樣」的初始
 * 猜測，永遠要讓使用者能在校正頁編輯，不能直接拿去寫入資料庫。
 */

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export interface OcrLine {
  text: string
  box: Box
}

export interface RosterRowGuess {
  employeeName: string
  /** 一格對應一個日期欄：null 代表看起來是休假或沒抓到東西，有值時是 "HHmm-HHmm" 格式的原始猜測 */
  cells: (string | null)[]
}

export interface RosterTableGuess {
  dates: string[] // YYYY-MM-DD
  rows: RosterRowGuess[]
}

const DATE_TOKEN = /(\d{1,2})[/-](\d{1,2})/
const DATE_TOKEN_G = /(\d{1,2})[/-](\d{1,2})/g
const CELL_TOKEN = /(\d{3,4})\s*[-–~]\s*(\d{3,4})|([-–—])/
const CELL_TOKEN_G = /(\d{3,4})\s*[-–~]\s*(\d{3,4})|([-–—])/g

const STOP_WORDS = ['預估', 'PSD', '合計', '工時', '最低標準', '差異', '提醒', '角色', '員工姓名', '代班', '特休', '備註', '排班表', '核印']
const CJK_RE = /[一-鿿]+/g

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function centerX(b: Box): number { return (b.left + b.right) / 2 }
function centerY(b: Box): number { return (b.top + b.bottom) / 2 }

/**
 * 依 Y 軸區間是否重疊分群（同一列的姓名跟時間格常因字型高度不同而中心點對不齊，
 * 用區間重疊比固定容忍值的中心點距離穩）。輸入需先依 top 排序過。
 */
function clusterByYOverlap<T>(sortedByTop: T[], boxOf: (t: T) => Box): T[][] {
  const clusters: T[][] = []
  for (const item of sortedByTop) {
    const itemBox = boxOf(item)
    let matched: T[] | null = null
    for (let i = clusters.length - 1; i >= 0; i--) {
      const cluster = clusters[i]
      if (cluster.some(c => {
        const cBox = boxOf(c)
        return itemBox.top < cBox.bottom && itemBox.bottom > cBox.top
      })) {
        matched = cluster
        break
      }
    }
    if (matched) matched.push(item)
    else clusters.push([item])
  }
  return clusters
}

interface DateHit { date: string; box: Box }

function clusterGeometry(lines: OcrLine[], year: number): RosterTableGuess {
  const dateHits: DateHit[] = []
  for (const line of lines) {
    const m = DATE_TOKEN.exec(line.text)
    if (!m) continue
    const month = parseInt(m[1], 10)
    const day = parseInt(m[2], 10)
    if (month < 1 || month > 12 || day < 1 || day > 31) continue
    dateHits.push({ date: isoDate(year, month, day), box: line.box })
  }
  if (dateHits.length === 0) return { dates: [], rows: [] }

  const dateHitsByTop = [...dateHits].sort((a, b) => a.box.top - b.box.top)
  const dateGroups = clusterByYOverlap(dateHitsByTop, h => h.box)
  const headerCluster = dateGroups.reduce((a, b) => (a.length >= b.length ? a : b))

  const headerTop = Math.min(...headerCluster.map(h => h.box.top))
  const headerBottomOfCluster = Math.max(...headerCluster.map(h => h.box.bottom))
  const headerHeight = headerBottomOfCluster - headerTop
  const headerCenterY = (headerTop + headerBottomOfCluster) / 2

  const byDate = new Map<string, DateHit>()
  for (const group of dateGroups) {
    const isHeaderGroup = group === headerCluster
    const groupCenterY = group.reduce((s, h) => s + centerY(h.box), 0) / group.length
    if (!isHeaderGroup && Math.abs(groupCenterY - headerCenterY) > headerHeight * 1.5) continue
    for (const hit of group) {
      const existing = byDate.get(hit.date)
      if (!existing || Math.abs(centerY(hit.box) - headerCenterY) < Math.abs(centerY(existing.box) - headerCenterY)) {
        byDate.set(hit.date, hit)
      }
    }
  }
  const headerSorted = [...byDate.values()].sort((a, b) => centerX(a.box) - centerX(b.box))

  const dates = headerSorted.map(h => h.date)
  const dateColX = headerSorted.map(h => centerX(h.box))
  const headerBottom = Math.max(...headerSorted.map(h => h.box.bottom))

  let avgSpacing = 100
  if (dateColX.length >= 2) {
    let totalGap = 0
    for (let i = 1; i < dateColX.length; i++) totalGap += dateColX[i] - dateColX[i - 1]
    avgSpacing = totalGap / (dateColX.length - 1)
  }
  // 每一欄各自的容忍範圍，看它自己跟左右鄰欄的實際距離，不要用整張表格的平均欄寬——
  // 拍照的透視變形常讓表格一邊比另一邊寬，用全域平均值篩會誤丟最外側欄的格子。
  const colTolerance = dateColX.map((x, i) => {
    if (dateColX.length === 1) return avgSpacing * 0.6
    const leftGap = i > 0 ? dateColX[i] - dateColX[i - 1] : null
    const rightGap = i < dateColX.length - 1 ? dateColX[i + 1] - dateColX[i] : null
    const gap = leftGap == null ? rightGap! : rightGap == null ? leftGap : Math.min(leftGap, rightGap)
    return gap * 0.6
  })

  const labelZoneRight = headerSorted[0].box.left
  const bodyLines = lines.filter(l => l.box.top >= headerBottom)
  const labelLines = bodyLines.filter(l => centerX(l.box) < labelZoneRight)
  const cellLines = bodyLines.filter(l => centerX(l.box) >= labelZoneRight)

  const nameLines: OcrLine[] = []
  for (const line of labelLines) {
    if (STOP_WORDS.some(w => line.text.includes(w))) continue
    const cjkMatches = line.text.match(CJK_RE)
    const cjk = cjkMatches ? cjkMatches.join('') : ''
    if (cjk) nameLines.push({ text: cjk, box: line.box })
  }
  if (nameLines.length === 0) return { dates: [], rows: [] }

  const nameLinesByTop = [...nameLines].sort((a, b) => a.box.top - b.box.top)
  const nameGroups = clusterByYOverlap(nameLinesByTop, l => l.box)

  const rowAnchors = nameGroups
    .map(group => {
      const name = [...group].sort((a, b) => a.box.left - b.box.left).map(l => l.text).join('')
      const y = group.reduce((s, l) => s + centerY(l.box), 0) / group.length
      return { name, y }
    })
    .sort((a, b) => a.y - b.y)

  let avgRowSpacing = Infinity
  if (rowAnchors.length >= 2) {
    let totalGap = 0
    for (let i = 1; i < rowAnchors.length; i++) totalGap += rowAnchors[i].y - rowAnchors[i - 1].y
    avgRowSpacing = totalGap / (rowAnchors.length - 1)
  }

  const cellPartsByRow: string[][][] = rowAnchors.map(() => dates.map(() => [] as string[]))
  for (const line of cellLines) {
    let nearestRow = 0
    let nearestRowDist = Math.abs(centerY(line.box) - rowAnchors[0].y)
    for (let r = 1; r < rowAnchors.length; r++) {
      const d = Math.abs(centerY(line.box) - rowAnchors[r].y)
      if (d < nearestRowDist) { nearestRowDist = d; nearestRow = r }
    }
    if (nearestRowDist > avgRowSpacing * 0.6) continue // 離每一列都太遠，當雜訊丟棄

    const x = centerX(line.box)
    let nearestCol = 0
    let nearestColDist = Math.abs(x - dateColX[0])
    for (let c = 1; c < dateColX.length; c++) {
      const d = Math.abs(x - dateColX[c])
      if (d < nearestColDist) { nearestColDist = d; nearestCol = c }
    }
    if (nearestColDist <= colTolerance[nearestCol]) {
      cellPartsByRow[nearestRow][nearestCol].push(line.text)
    }
  }

  const rows: RosterRowGuess[] = []
  for (let r = 0; r < rowAnchors.length; r++) {
    const name = rowAnchors[r].name.trim()
    if (!name || STOP_WORDS.some(w => name.includes(w))) continue

    const cells: (string | null)[] = dates.map(() => null)
    for (let col = 0; col < dates.length; col++) {
      const parts = cellPartsByRow[r][col]
      if (parts.length === 0) continue
      const m = CELL_TOKEN.exec(parts.join(' '))
      if (!m) continue
      cells[col] = m[3] !== undefined ? null : `${m[1]}-${m[2]}`
    }
    rows.push({ employeeName: name, cells })
  }

  return { dates, rows }
}

/** 完全找不到座標可用（或座標分群找不到表頭）時的純文字備援版本 */
function parseRosterTableFromText(rawText: string, year: number): RosterTableGuess {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  let headerIndex = -1
  let dates: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const matches = [...lines[i].matchAll(DATE_TOKEN_G)]
    if (matches.length < 2 || matches.length <= dates.length) continue
    headerIndex = i
    dates = matches.map(m => {
      const month = parseInt(m[1], 10)
      const day = parseInt(m[2], 10)
      if (month < 1 || month > 12 || day < 1 || day > 31) return isoDate(year, 1, 1)
      return isoDate(year, month, day)
    })
  }

  const rows: RosterRowGuess[] = []
  for (let i = 0; i < lines.length; i++) {
    if (i === headerIndex || dates.length === 0) continue
    const line = lines[i]
    if (STOP_WORDS.some(w => line.includes(w))) continue

    // 姓名跟班次資料的分界：第一個數字或「-」（休假格常整列都是「-」，前面完全沒有數字）
    const firstCellChar = line.search(/[\d\-–—]/)
    if (firstCellChar <= 0) continue
    const name = line.slice(0, firstCellChar).trim()
    if (!name) continue

    const cellMatches = [...line.slice(firstCellChar).matchAll(CELL_TOKEN_G)]
    if (cellMatches.length === 0) continue

    const cells: (string | null)[] = dates.map(() => null)
    for (let col = 0; col < dates.length && col < cellMatches.length; col++) {
      const m = cellMatches[col]
      cells[col] = m[3] !== undefined ? null : `${m[1]}-${m[2]}`
    }
    rows.push({ employeeName: name, cells })
  }

  return { dates, rows }
}

/** 表頭通常只有月/日沒有年份，預設用今年，校正畫面要能改。 */
export function parseRosterTableFromLines(lines: OcrLine[], rawText: string, referenceYear?: number): RosterTableGuess {
  const year = referenceYear ?? new Date().getFullYear()
  const guess = clusterGeometry(lines, year)
  if (guess.dates.length > 0) return guess
  return parseRosterTableFromText(rawText, year)
}

/** 一格文字（例如 "0700-1500"、"-"、空白）轉成給後端的 (start, end)，無法辨識一律當休假 */
export function parseCell(raw: string): { start: string | null; end: string | null } {
  const trimmed = raw.trim()
  if (!trimmed || /^[-–—]+$/.test(trimmed)) return { start: null, end: null }
  const parts = trimmed.split(/[-–~]/)
  if (parts.length !== 2) return { start: null, end: null }
  return { start: normalizeTime(parts[0]), end: normalizeTime(parts[1]) }
}

function normalizeTime(token: string): string | null {
  const digits = token.replace(/\D/g, '')
  if (!digits) return null
  const padded = digits.padStart(4, '0')
  if (padded.length !== 4) return null
  return `${padded.slice(0, 2)}:${padded.slice(2)}`
}
