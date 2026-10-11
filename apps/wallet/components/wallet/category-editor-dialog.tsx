'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useCustomCategories } from '@/hooks/use-custom-categories'
import { confirmDialog } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { Category, TransactionType } from '@/lib/types'
import { COLOR_CHOICES, CategoryGlyph, ICON_CHOICES } from './category-icon'

// 新增／編輯自訂分類：名稱、圖示、顏色。editing 有值就是編輯（可以刪除），沒有就是新增 type 類的分類。
// 每次打開都是重新掛載（外層在 open 時才 render），所以初始值直接從 props 帶
export function CategoryEditorDialog({
  open, onOpenChange, type, editing, onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: TransactionType
  editing?: Category
  onSaved?: (category: Category) => void
}) {
  const { create, update, remove } = useCustomCategories()
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? 'heart')
  const [colorIdx, setColorIdx] = useState(() => {
    const i = COLOR_CHOICES.findIndex(([bg]) => bg === editing?.color)
    return i === -1 ? 0 : i
  })
  const [saving, setSaving] = useState(false)
  const [bg, fg] = COLOR_CHOICES[colorIdx]

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      if (editing) {
        await update(editing.id, { name: trimmed, icon, color: bg, text: fg })
        onSaved?.({ ...editing, name: trimmed, icon, color: bg, text: fg })
        toast('分類已更新')
      } else {
        const created = await create({ name: trimmed, type, icon, color: bg, text: fg })
        onSaved?.(created)
        toast(`已新增「${trimmed}」`)
      }
      onOpenChange(false)
    } catch {
      toast('儲存失敗，請再試一次', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (!(await confirmDialog(`刪除分類「${editing.name}」？\n已經記在這個分類的紀錄不會被刪掉。`, { confirmText: '刪除', danger: true }))) return
    try {
      await remove(editing.id)
      toast('已刪除分類')
      onOpenChange(false)
    } catch {
      toast('刪除失敗，請再試一次', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm gap-0 p-0">
        <DialogTitle className="px-5 pt-5 text-base font-semibold">
          {editing ? '編輯分類' : `新增${type === 'expense' ? '支出' : '收入'}分類`}
        </DialogTitle>

        <div className="flex flex-col gap-4 px-5 py-4">
          {/* 預覽＋名稱 */}
          <div className="flex items-center gap-3">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl transition-colors"
              style={{ backgroundColor: bg, color: fg }}
            >
              <CategoryGlyph iconKey={icon} className="size-7" strokeWidth={1.8} />
            </span>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              maxLength={10}
              placeholder="分類名稱，例如：旅遊"
              className="min-w-0 flex-1 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>

          {/* 顏色 */}
          <div className="flex flex-wrap gap-2">
            {COLOR_CHOICES.map(([cBg, cFg], i) => (
              <button
                key={cBg}
                onClick={() => setColorIdx(i)}
                aria-label={`顏色 ${i + 1}`}
                aria-pressed={i === colorIdx}
                className={cn('size-7 rounded-full ring-offset-2 ring-offset-background transition-all', i === colorIdx && 'scale-110 ring-2')}
                style={{ backgroundColor: cBg, ['--tw-ring-color' as string]: cFg }}
              >
                <span className="mx-auto block size-2.5 rounded-full" style={{ backgroundColor: cFg }} />
              </button>
            ))}
          </div>

          {/* 圖示 */}
          <div className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto rounded-xl bg-muted/30 p-2">
            {ICON_CHOICES.map(key => (
              <button
                key={key}
                onClick={() => setIcon(key)}
                aria-pressed={key === icon}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl transition-colors',
                  key === icon ? 'shadow-sm' : 'text-muted-foreground hover:bg-muted',
                )}
                style={key === icon ? { backgroundColor: bg, color: fg } : undefined}
              >
                <CategoryGlyph iconKey={key} className="size-5" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 border-t p-3">
          {editing ? (
            <button onClick={handleDelete} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
              刪除
            </button>
          ) : (
            <button onClick={() => onOpenChange(false)} className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted/50">
              取消
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
