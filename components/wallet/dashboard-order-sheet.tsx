'use client'

import { useRef, useState } from 'react'
import { GripVerticalIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Card } from '@/lib/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

// 首頁「現金／卡片」拖拉排序。用 pointer events 自己實作（不用 HTML5 native
// drag，觸控支援太差），拖動時用 elementFromPoint 命中測試找出目前懸停在
// 哪一列的 data-drag-id，即時把陣列元素搬過去。每次拖完一項就直接呼叫
// onSave，不用另外按確定。
export function DashboardOrderSheet({
  open, onOpenChange, cards, initialOrder, onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cards: Card[]
  initialOrder: string[] | null
  onSave: (order: string[]) => void
}) {
  const defaultOrder = ['cash', ...cards.map(c => c.id)]
  const [order, setOrder] = useState<string[]>(() => {
    if (!initialOrder) return defaultOrder
    const known = new Set(defaultOrder)
    const kept = initialOrder.filter(id => known.has(id))
    const missing = defaultOrder.filter(id => !kept.includes(id))
    return [...kept, ...missing]
  })
  const draggingRef = useRef<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function itemInfo(id: string) {
    if (id === 'cash') return { emoji: '💵', name: '現金' }
    const c = cards.find(c => c.id === id)
    if (!c) return { emoji: '❓', name: '(已刪除的卡片)' }
    return { emoji: c.type === 'credit' ? '💳' : c.type === 'easycard' ? '🚌' : '🏧', name: c.name }
  }

  function handlePointerDown(e: React.PointerEvent, id: string) {
    draggingRef.current = id
    setDraggingId(id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const overId = el?.closest<HTMLElement>('[data-drag-id]')?.dataset.dragId
    if (!overId || overId === draggingRef.current) return
    setOrder(prev => {
      const from = prev.indexOf(draggingRef.current!)
      const to = prev.indexOf(overId)
      if (from === -1 || to === -1 || from === to) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, draggingRef.current!)
      return next
    })
  }

  function handlePointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = null
    setDraggingId(null)
    onSave(order)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="p-0 max-w-sm overflow-hidden">
        <DialogTitle className="sr-only">排序首頁項目</DialogTitle>

        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">排序首頁項目</span>
          <button onClick={() => onOpenChange(false)} className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5 p-4">
          <p className="mb-1 text-xs text-muted-foreground">按住右邊的把手拖拉，調整「現金／卡片」的顯示順序</p>
          {order.map(id => {
            const info = itemInfo(id)
            return (
              <div
                key={id}
                data-drag-id={id}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5 transition-transform',
                  draggingId === id && 'scale-[1.02] bg-amber-50 dark:bg-amber-900/20',
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center text-base">{info.emoji}</span>
                <span className="flex-1 truncate text-sm">{info.name}</span>
                <span
                  onPointerDown={e => handlePointerDown(e, id)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{ touchAction: 'none' }}
                  className="flex size-8 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                >
                  <GripVerticalIcon className="size-4" />
                </span>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
