'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, DeleteIcon, MicIcon, PlusIcon, Trash2Icon, UsersIcon, XIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { useCards } from '@/hooks/use-cards'
import { useTransactions } from '@/hooks/use-transactions'
import { getCategoryById, pickableCategories, type Category, type Transaction, type TransactionType } from '@/lib/types'
import { useCustomCategories } from '@/hooks/use-custom-categories'
import { todayString } from '@/lib/finance-utils'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { confirmDialog } from '@/lib/confirm'
import { CategoryBadge, CategoryGlyph } from './category-icon'
import { CategoryEditorDialog } from './category-editor-dialog'
import { PaymentIcon } from './payment-icon'
import { useSpeech } from '@/hooks/use-speech'
import { useWorkRate } from '@/hooks/use-work-rate'
import { SplitDialog } from './split-dialog'
import { formatWorkTime } from '@/lib/salary'
import * as api from '@/lib/api'

// ── 上次用的分類（收入、支出各記一個），新增時預選 ─────────────────────────────
const LAST_CATEGORY_KEY = 'yiwallet_last_category'

function lastCategory(type: TransactionType): string {
  try {
    const id = JSON.parse(localStorage.getItem(LAST_CATEGORY_KEY) ?? '{}')[type] ?? ''
    return getCategoryById(id)?.hidden ? '' : id // 已經下架的舊分類不要預選
  } catch {
    return ''
  }
}

function rememberCategory(type: TransactionType, category: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_CATEGORY_KEY) ?? '{}')
    localStorage.setItem(LAST_CATEGORY_KEY, JSON.stringify({ ...saved, [type]: category }))
  } catch {}
}

// ── 計算機 ─────────────────────────────────────────────────────────────────────
const OPERATORS = ['+', '−', '×', '÷']
const isOperator = (c: string) => OPERATORS.includes(c)

// "120+35×2" → 190：先乘除後加減；結尾是運算子就先忽略它；除以 0 當 0
export function evaluateAmount(expr: string): number {
  const tokens = expr.replace(/[+−×÷]$/, '').match(/[\d.]+|[+−×÷]/g)
  if (!tokens) return 0
  const terms: number[] = []
  let sign = 1
  let term = parseFloat(tokens[0]) || 0
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i]
    const n = parseFloat(tokens[i + 1]) || 0
    if (op === '×') term *= n
    else if (op === '÷') term = n === 0 ? 0 : term / n
    else {
      terms.push(sign * term)
      sign = op === '−' ? -1 : 1
      term = n
    }
  }
  terms.push(sign * term)
  return Math.round(terms.reduce((a, b) => a + b, 0) * 100) / 100
}

// 計算機鍵盤：5 欄 × 4 列，照畫面順序排；OK 佔右下兩列（row-span-2），grid 會自動把
// 第 4 列的最後一格讓給它
type PadKey = { key: string; kind: 'num' | 'op' | 'fn' | 'ok' }
const PAD: PadKey[] = [
  { key: '7', kind: 'num' }, { key: '8', kind: 'num' }, { key: '9', kind: 'num' }, { key: '÷', kind: 'op' }, { key: 'AC', kind: 'fn' },
  { key: '4', kind: 'num' }, { key: '5', kind: 'num' }, { key: '6', kind: 'num' }, { key: '×', kind: 'op' }, { key: '⌫', kind: 'fn' },
  { key: '1', kind: 'num' }, { key: '2', kind: 'num' }, { key: '3', kind: 'num' }, { key: '+', kind: 'op' }, { key: 'OK', kind: 'ok' },
  { key: '00', kind: 'num' }, { key: '0', kind: 'num' }, { key: '.', kind: 'num' }, { key: '−', kind: 'op' },
]
const KEY_LABEL: Record<string, string> = { '÷': '除', '×': '乘', '+': '加', '−': '減', '⌫': '刪除一位', AC: '全部清除', OK: '儲存' }

interface AddTransactionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>, isCash: boolean) => Promise<unknown> | void
  initialData?: Transaction
  onDelete?: () => Promise<void>
}

export function AddTransactionSheet({ open, onOpenChange, onSubmit, initialData, onDelete }: AddTransactionSheetProps) {
  const isDesktop = useIsDesktop()
  const { cards, defaultCard } = useCards()
  const { transactions } = useTransactions()

  const [type, setType] = useState<TransactionType>(initialData?.type ?? 'expense')
  const [category, setCategory] = useState(() =>
    initialData ? initialData.category : (typeof window !== 'undefined' ? lastCategory('expense') : ''))
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '')
  // 轉帳的備註存成「對象|備註」
  const [note, setNote] = useState(() => {
    if (initialData?.category === 'transfer' && initialData.note) {
      const idx = initialData.note.indexOf('|')
      return idx === -1 ? '' : initialData.note.slice(idx + 1)
    }
    return initialData?.note ?? ''
  })
  const [transferTo, setTransferTo] = useState(() => {
    if (initialData?.category === 'transfer' && initialData.note) {
      const idx = initialData.note.indexOf('|')
      return idx === -1 ? initialData.note : initialData.note.slice(0, idx)
    }
    return ''
  })
  const [date, setDate] = useState(initialData?.date ?? todayString())
  // 商家／品名：Apple Pay、電子發票、LINE 記帳帶進來的，編輯時才顯示讓人改
  const [description, setDescription] = useState(
    initialData?.description && initialData.description !== initialData.note ? initialData.description : '')
  const [cardId, setCardId] = useState<string | undefined>(
    initialData ? initialData.cardId : (defaultCard?.id ?? cards[0]?.id))
  const [isExplicitCash, setIsExplicitCash] = useState(!!initialData?.isCash && !initialData.cardId)
  const [saving, setSaving] = useState(false)
  // 存好之後 OK 鍵先畫一個打勾，停一下才關面板——這是整個 App 最常做的動作，給它一個確實的完成感
  const [justSaved, setJustSaved] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)

  // 語音記帳：說「午餐一百二 LINE Pay」，聽完把欄位填好讓使用者確認再按 OK。
  // 跟 Siri 同一套規則：聽不出分類就不選（請使用者選），沒說付款方式就不預選卡片
  const speech = useSpeech()
  const [parsingVoice, setParsingVoice] = useState(false)
  async function applyVoice(text: string) {
    setParsingVoice(true)
    try {
      const r = await api.parseVoice(text)
      if (r.amount == null) {
        toast('沒聽到金額，再說一次，例如「午餐 120 現金」', 'error')
        return
      }
      setType(r.type)
      setCategory(r.category ?? '')
      setAmount(String(r.amount))
      setNote(r.note)
      setDate(r.date)
      if (r.card_id) { setCardId(r.card_id); setIsExplicitCash(false) }
      else if (r.is_cash) { setCardId(undefined); setIsExplicitCash(true) }
      else { setCardId(undefined); setIsExplicitCash(false) }
      const missing = [!r.category && '分類', !r.card_id && !r.is_cash && cards.length > 0 && '付款方式'].filter(Boolean)
      toast(missing.length ? `聽好了，再選一下${missing.join('和')}` : '聽好了，確認沒問題就按 OK')
    } catch {
      toast('語音辨識失敗，請再試一次', 'error')
    } finally {
      setParsingVoice(false)
    }
  }
  function toggleVoice() {
    if (speech.listening) speech.stop()
    else speech.start(applyVoice, err => { if (err !== 'aborted' && err !== 'no-speech') toast('沒辦法使用麥克風，請確認有允許麥克風權限', 'error') })
  }

  const selectedCard = cards.find(c => c.id === cardId)
  const isDebitCard = selectedCard?.type === 'debit'

  // 自訂分類有新增／修改時重新 render
  useCustomCategories()
  const [editor, setEditor] = useState<{ editing?: Category } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 內建＋自訂；編輯舊紀錄時，就算它的分類已經下架也要列出來（不然看不出選了什麼）
  const legacy = initialData && getCategoryById(initialData.category)
  const categories = [
    ...pickableCategories(type),
    ...(legacy?.hidden && legacy.type === type ? [legacy] : []),
  ].filter(c => c.id !== 'transfer' || isDebitCard)

  // 自訂分類長按 0.5 秒打開編輯（手機上沒有右鍵）；電腦上右鍵也可以
  function startLongPress(cat: Category) {
    if (!cat.custom) return
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      setEditor({ editing: cat })
    }, 500)
  }
  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  // 快選備註：這個分類最常打的備註（像「康是美」「早餐店」），點一下就填好
  const noteSuggestions = useMemo(() => {
    if (!category) return []
    const counts = new Map<string, number>()
    for (const t of transactions) {
      const n = t.note?.trim()
      if (t.category !== category || !n || n.length > 12 || /領現|薪資/.test(n)) continue
      counts.set(n, (counts.get(n) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n)
  }, [transactions, category])

  // 卡片載入完成後，新增模式還沒選卡就帶入常用卡
  useEffect(() => {
    if (!initialData && cardId === undefined && !isExplicitCash) {
      const preferred = defaultCard?.id ?? cards[0]?.id
      if (preferred) setCardId(preferred)
    }
  }, [defaultCard?.id, cards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // 換到不是金融卡時，轉帳分類不能用了
  useEffect(() => {
    if (category === 'transfer' && !isDebitCard) {
      setCategory('')
      setTransferTo('')
    }
  }, [isDebitCard]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTypeChange(t: TransactionType) {
    if (t === type) return
    setType(t)
    setCategory(initialData ? '' : lastCategory(t))
    setTransferTo('')
  }

  const handleSave = useCallback(async () => {
    const parsed = evaluateAmount(amount)
    if (!amount || isNaN(parsed) || parsed <= 0 || !category || saving) return
    // 沒有任何卡片的人一律是現金；有卡片的人要明確點「現金」才算，不然就是還沒指定
    const isCash = !cardId && (cards.length === 0 || isExplicitCash)
    const savedNote = category === 'transfer'
      ? (transferTo ? (note ? `${transferTo}|${note}` : transferTo) : note)
      : note
    setSaving(true)
    try {
      await onSubmit({
        type, amount: parsed, category, note: savedNote, date, cardId, isCash,
        ...(initialData ? { description: description.trim() || savedNote } : {}),
      }, isCash)
    } catch {
      toast(initialData ? '儲存失敗，請再試一次' : '記帳失敗，請再試一次', 'error')
      return
    } finally {
      setSaving(false)
    }
    setJustSaved(true)
    await new Promise(resolve => setTimeout(resolve, 450))
    setJustSaved(false)
    if (initialData) toast('已更新')
    else rememberCategory(type, category)
    setAmount(''); setNote(''); setTransferTo(''); setDate(todayString()); setType('expense')
    setCategory(initialData ? '' : lastCategory('expense'))
    setIsExplicitCash(false)
    setCardId(defaultCard?.id ?? cards[0]?.id)
    onOpenChange(false)
  }, [amount, category, type, note, transferTo, date, cardId, isExplicitCash, onSubmit, onOpenChange, defaultCard?.id, saving, initialData, description, cards])

  const handleKey = useCallback((key: string) => {
    if (key === 'OK') { handleSave(); return }
    if (key === 'AC') { setAmount(''); return }
    if (key === '⌫') { setAmount(prev => prev.slice(0, -1)); return }
    if (key === '=') {
      const result = evaluateAmount(amount)
      setAmount(result > 0 ? String(result) : '')
      return
    }
    if (isOperator(key)) {
      if (!amount) return
      // 連按兩個運算子就換成後按的那個
      setAmount(prev => (isOperator(prev.slice(-1)) ? prev.slice(0, -1) : prev) + key)
      return
    }
    const current = amount.split(/[+−×÷]/).pop() ?? ''
    if (key === '.' && current.includes('.')) return
    if (key === '00' && current === '') return
    if (current.replace('.', '').length >= 8) return
    setAmount(prev => prev + key)
  }, [amount, handleSave])

  // 電腦上直接用實體鍵盤：數字、小數點、+ - * /、Backspace、Esc 清除、Enter 存檔。
  // 正在備註欄這類輸入框打字時不攔截。
  useEffect(() => {
    if (!open) return
    const MAP: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷', '=': '=', Backspace: '⌫', Delete: 'AC', Enter: 'OK', '.': '.' }
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = /^[0-9]$/.test(e.key) ? e.key : MAP[e.key]
      if (!key) return
      e.preventDefault()
      handleKey(key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleKey])

  const evaluated = evaluateAmount(amount)
  // 「這筆等於上班多久」：有設工作薪資才顯示，只算支出（轉帳不算）
  const workRate = useWorkRate()
  const workTime = type === 'expense' && category !== 'transfer' && workRate ? formatWorkTime(evaluated, workRate) : null
  const hasExpression = /[+−×÷]/.test(amount)
  const displayAmount = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(evaluated)
  const isValid = evaluated > 0 && !!category

  // 已經輸入金額卻按返回／點外面，先確認，避免誤觸把剛打的內容丟掉
  const initialAmount = initialData ? String(initialData.amount) : ''
  async function requestClose() {
    if (amount && amount !== initialAmount
      && !(await confirmDialog('金額還沒儲存，確定要關閉嗎？', { confirmText: '關閉', danger: true }))) return
    onOpenChange(false)
  }

  async function handleDelete() {
    if (!onDelete) return
    const label = description || initialData?.description || '這筆紀錄'
    if (!(await confirmDialog(`確定刪除「${label}」？\n刪除後無法復原。`, { confirmText: '刪除', danger: true }))) return
    try {
      await onDelete()
      toast('已刪除')
      onOpenChange(false)
    } catch {
      toast('刪除失敗，請再試一次', 'error')
    }
  }

  // 面板一打開就讓面板本身取得焦點，電腦上不用先點一下就能直接打數字
  const panelRef = useRef<HTMLDivElement>(null)
  function focusPanel(e: Event) {
    e.preventDefault()
    panelRef.current?.focus()
  }
  function handleOpenChange(next: boolean) {
    if (next) onOpenChange(true)
    else requestClose()
  }

  const dateObj = parseISO(date)
  const today = todayString()
  const dayPrefix = date === today ? '今日' : date === format(addDays(new Date(), -1), 'yyyy-MM-dd') ? '昨日' : ''
  const accent = type === 'expense' ? 'text-rose-500' : 'text-emerald-600'

  const inner = (
    <div ref={panelRef} tabIndex={-1} className="flex h-full flex-col outline-none">
      {/* ── 標題列：返回／支出收入切換／刪除 ── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
        <button onClick={requestClose} aria-label="關閉" className="flex size-9 items-center justify-center rounded-full hover:bg-muted">
          <XIcon className="size-5" />
        </button>
        <div role="tablist" className="relative grid w-44 grid-cols-2 rounded-full bg-muted p-1">
          {/* 滑動的選中底色 */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full shadow-sm transition-transform duration-300 ease-(--ease-out-expo)',
              type === 'expense' ? 'translate-x-0 bg-brand' : 'translate-x-full bg-emerald-500',
            )}
          />
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={type === t}
              onClick={() => handleTypeChange(t)}
              className={cn(
                'relative z-10 py-1.5 text-sm font-semibold transition-colors',
                type === t ? (t === 'expense' ? 'text-brand-foreground' : 'text-white') : 'text-muted-foreground',
              )}
            >
              {t === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>
        {onDelete ? (
          <button onClick={handleDelete} aria-label="刪除這筆" className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/20">
            <Trash2Icon className="size-4" />
          </button>
        ) : (
          <div className="size-9" />
        )}
      </div>

      {/* ── 分類格子（可捲動）── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div key={type} className="stagger grid grid-cols-4 gap-x-2 gap-y-4 px-4 py-5">
          <button onClick={() => setEditor({})} aria-label="新增分類" className="group flex flex-col items-center gap-1.5">
            <span className="flex size-14 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors group-hover:border-brand group-hover:text-brand-text">
              <PlusIcon className="size-6" />
            </span>
            <span className="text-xs text-muted-foreground">新增分類</span>
          </button>
          {categories.map(cat => {
            const selected = category === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(prev => (prev === cat.id ? '' : cat.id))}
                onPointerDown={() => startLongPress(cat)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={e => { if (cat.custom) { e.preventDefault(); setEditor({ editing: cat }) } }}
                aria-pressed={selected}
                aria-label={selected ? `${cat.name}（已選，再點一次取消）` : cat.custom ? `${cat.name}（長按可編輯）` : cat.name}
                className="group flex select-none flex-col items-center gap-1.5 [-webkit-touch-callout:none]"
              >
                <span
                  className={cn(
                    'relative flex size-14 items-center justify-center rounded-2xl transition-all duration-300 ease-(--ease-out-expo)',
                    selected ? 'scale-105 shadow-md' : 'bg-muted/60 group-hover:bg-muted',
                  )}
                  style={selected ? { backgroundColor: cat.color, color: cat.text } : undefined}
                >
                  <CategoryGlyph id={cat.id} className="size-7" strokeWidth={1.8} />
                  {selected && <span className="absolute -right-1 -top-1 size-3 rounded-full bg-brand ring-2 ring-background" />}
                </span>
                <span className={cn('text-xs', selected ? 'font-bold' : 'text-muted-foreground')}>{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 下半部：金額、備註、付款方式、日期、計算機 ── */}
      <div className="shrink-0 rounded-t-3xl border-t bg-background shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.15)]">
        {/* 金額 + 備註 */}
        <div className="flex items-center gap-3 px-4 pt-3">
          {category ? <CategoryBadge id={category} className="size-11" /> : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-[10px] text-muted-foreground">分類</span>
          )}
          <div className="flex min-w-0 flex-col">
            {hasExpression && <span className="truncate text-xs tabular-nums text-muted-foreground">{amount}</span>}
            <span key={displayAmount} className={cn('text-3xl font-bold tabular-nums animate-pop', accent)}>${displayAmount}</span>
            {workTime && <span className="animate-fade text-[11px] text-muted-foreground">≈ {workTime}</span>}
          </div>
          {speech.supported && (
            <button
              onClick={toggleVoice}
              disabled={parsingVoice}
              aria-label={speech.listening ? '停止語音輸入' : '用說的記帳'}
              aria-pressed={speech.listening}
              className={cn(
                'relative ml-auto flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
                speech.listening ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />}
              <MicIcon className="relative size-5" />
            </button>
          )}
          <div className={cn('h-10 w-px bg-border', !speech.supported && 'ml-auto')} />
          <input
            placeholder={category === 'transfer' ? '轉給誰（選填）' : '輸入備註'}
            value={category === 'transfer' ? transferTo : note}
            onChange={e => (category === 'transfer' ? setTransferTo(e.target.value) : setNote(e.target.value))}
            className="w-28 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-36"
          />
        </div>

        {/* 說話中：即時顯示聽到的內容 */}
        {(speech.listening || parsingVoice) && (
          <p className="mx-4 mt-2 animate-fade rounded-xl bg-muted/60 px-3 py-2 text-sm">
            {parsingVoice ? '整理中…' : speech.transcript || '請說，例如「午餐一百二 LINE Pay」'}
          </p>
        )}

        {/* 快選備註、商家（編輯時）、轉帳的額外備註 */}
        {(noteSuggestions.length > 0 || initialData || category === 'transfer') && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-2.5 scrollbar-none">
            {category === 'transfer' && (
              <input
                placeholder="備註（選填）"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-32 shrink-0 rounded-full bg-muted px-3 py-1 text-xs outline-none placeholder:text-muted-foreground"
              />
            )}
            {initialData?.type === 'expense' && (
              <button
                onClick={() => setSplitOpen(true)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-soft-foreground"
              >
                <UsersIcon className="size-3.5" />跟好友分帳
              </button>
            )}
            {initialData && (
              <input
                aria-label="商家"
                placeholder="商家／品名"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={100}
                className="w-32 shrink-0 rounded-full bg-muted px-3 py-1 text-xs outline-none placeholder:text-muted-foreground"
              />
            )}
            {category !== 'transfer' && noteSuggestions.map(n => (
              <button
                key={n}
                onClick={() => setNote(n)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  note === n ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-muted/70',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {/* 付款方式 */}
        {cards.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-2.5 scrollbar-none">
            <button
              onClick={() => { setCardId(undefined); setIsExplicitCash(true) }}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                !cardId && isExplicitCash ? 'border-emerald-500 bg-emerald-500 text-white' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <PaymentIcon kind="cash" className="mr-1 inline size-3.5 align-[-2px]" />現金
            </button>
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => { setCardId(card.id); setIsExplicitCash(false) }}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  cardId === card.id ? 'text-white' : 'text-muted-foreground hover:bg-muted',
                )}
                style={cardId === card.id ? { backgroundColor: card.color, borderColor: card.color } : undefined}
              >
                <PaymentIcon kind={card.type} className="mr-1 inline size-3.5 align-[-2px]" />{card.name}
              </button>
            ))}
          </div>
        )}

        {/* 計算機區：日期列 + 圓形按鍵 */}
        <div className="mt-3 bg-brand-soft px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="mb-3 flex items-center rounded-full bg-background shadow-sm ring-1 ring-foreground/10">
            <button onClick={() => setDate(format(addDays(dateObj, -1), 'yyyy-MM-dd'))} aria-label="前一天" className="flex size-10 items-center justify-center rounded-full hover:bg-muted">
              <ChevronLeftIcon className="size-5" />
            </button>
            <label className="relative flex flex-1 cursor-pointer items-center justify-center gap-2 text-sm font-semibold">
              <CalendarDaysIcon className="size-4 text-brand-text" />
              {dayPrefix && <span>{dayPrefix}</span>}
              <span className="tabular-nums">{format(dateObj, 'yyyy/MM/dd')}</span>
              <span className="text-muted-foreground">{format(dateObj, 'EEEE', { locale: zhTW })}</span>
              {/* 點日期打開系統的日期選擇器 */}
              <input
                type="date"
                aria-label="選擇日期"
                value={date}
                onChange={e => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <button onClick={() => setDate(format(addDays(dateObj, 1), 'yyyy-MM-dd'))} aria-label="後一天" className="flex size-10 items-center justify-center rounded-full hover:bg-muted">
              <ChevronRightIcon className="size-5" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PAD.map(({ key, kind }) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                disabled={kind === 'ok' && saving}
                aria-label={KEY_LABEL[key]}
                className={cn(
                  'flex items-center justify-center rounded-full font-semibold shadow-sm transition-colors',
                  kind === 'ok' ? 'row-span-2 text-lg' : 'aspect-square max-h-16 w-full text-xl',
                  kind === 'num' && 'bg-background ring-1 ring-foreground/10 hover:bg-muted',
                  kind === 'op' && 'bg-foreground/85 text-background hover:bg-foreground',
                  kind === 'fn' && 'bg-foreground/10 hover:bg-foreground/15',
                  kind === 'ok' && (justSaved
                    ? 'scale-105 bg-emerald-500 text-white transition-[background-color,scale] duration-200'
                    : isValid ? 'bg-brand text-brand-foreground hover:bg-brand-hover' : 'bg-brand/40 text-brand-foreground/60'),
                )}
              >
                {key === '⌫' ? <DeleteIcon className="size-5" />
                  : kind === 'ok' && justSaved ? (
                    <svg viewBox="0 0 24 24" className="size-8" aria-hidden="true">
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={24}
                        style={{ animation: 'check-draw 0.35s var(--ease-out-soft) backwards' }}
                      />
                    </svg>
                  )
                  : kind === 'ok' && saving ? '…' : key}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const title = initialData ? '編輯紀錄' : '新增紀錄'

  const editorDialog = (
    <>
      {editor && (
        <CategoryEditorDialog
          open
          onOpenChange={o => { if (!o) setEditor(null) }}
          type={type}
          editing={editor.editing}
          onSaved={c => { if (!editor.editing) setCategory(c.id) }}
        />
      )}
      {initialData && (
        <SplitDialog
          open={splitOpen}
          onOpenChange={setSplitOpen}
          transactionId={initialData.id}
          description={initialData.description || initialData.note || getCategoryById(initialData.category)?.name || '一筆支出'}
          total={initialData.amount}
        />
      )}
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false} onOpenAutoFocus={focusPanel} className="h-[min(820px,92dvh)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {inner}
        </DialogContent>
        {editorDialog}
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* 高度要寫成 data-[side=bottom]:h-dvh 才蓋得過 Sheet 內建的 data-[side=bottom]:h-auto；
          只寫 h-dvh 會輸給它，面板變得比螢幕高，最上面的支出／收入切換被推到畫面外 */}
      <SheetContent side="bottom" showCloseButton={false} onOpenAutoFocus={focusPanel} className="gap-0 p-0 data-[side=bottom]:h-dvh">
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {inner}
      </SheetContent>
      {editorDialog}
    </Sheet>
  )
}
