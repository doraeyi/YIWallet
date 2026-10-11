'use client'

import { useState } from 'react'
import { ChevronDownIcon, PencilIcon, PlusIcon, ShapesIcon } from 'lucide-react'
import { useCustomCategories } from '@/hooks/use-custom-categories'
import { cn } from '@/lib/utils'
import type { Category, TransactionType } from '@/lib/types'
import { CategoryBadge } from './category-icon'
import { CategoryEditorDialog } from './category-editor-dialog'

// 設定頁「自訂分類」：列出自己加的分類，可以新增、改名、換圖示顏色、刪除
export function CustomCategorySettings() {
  const { categories } = useCustomCategories()
  const [expanded, setExpanded] = useState(false)
  const [editor, setEditor] = useState<{ type: TransactionType; editing?: Category } | null>(null)
  const visible = categories.filter(c => !c.hidden)

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
      <button onClick={() => setExpanded(v => !v)} className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40">
        <div className="flex items-center gap-2.5">
          <ShapesIcon className="size-4 text-brand-text" />
          <span className="text-sm font-medium">自訂分類</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{visible.length > 0 ? `${visible.length} 個` : '尚未新增'}</span>
          <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t px-4 py-4">
          {(['expense', 'income'] as const).map(type => {
            const list = visible.filter(c => c.type === type)
            return (
              <div key={type} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">{type === 'expense' ? '支出' : '收入'}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setEditor({ type, editing: c })}
                      className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm hover:bg-muted/50"
                    >
                      <CategoryBadge id={c.id} className="size-7" />
                      {c.name}
                      <PencilIcon className="size-3 text-muted-foreground" />
                    </button>
                  ))}
                  <button
                    onClick={() => setEditor({ type })}
                    className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm text-muted-foreground hover:border-brand hover:text-brand-text"
                  >
                    <PlusIcon className="size-3.5" />
                    新增
                  </button>
                </div>
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground">記帳時在分類上長按也可以編輯。刪掉的分類，已經記在裡面的紀錄不會不見。</p>
        </div>
      )}

      {editor && (
        <CategoryEditorDialog
          open
          onOpenChange={o => { if (!o) setEditor(null) }}
          type={editor.type}
          editing={editor.editing}
        />
      )}
    </div>
  )
}
