'use client'

import { useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductBarcode } from './product-card'
import * as api from '@/lib/api'
import type { Product } from '@/lib/types'

const TYPE_OPTIONS = ['EAN13', 'EAN8', 'CODE128', 'UPCA', 'UPCE']

interface ProductDetailDialogProps {
  product: Product | null
  /** 目前畫面上顯示的商品清單（依同樣的順序），用來左右滑動切換上一筆/下一筆；不傳就沒有滑動切換 */
  list?: Product[]
  onNavigate?: (product: Product) => void
  onOpenChange: (open: boolean) => void
  onUpdated: (product: Product) => void
  onDeleted: (productId: string) => void
}

const SWIPE_THRESHOLD = 50

export function ProductDetailDialog({ product, list = [], onNavigate, onOpenChange, onUpdated, onDeleted }: ProductDetailDialogProps) {
  const [lastProductId, setLastProductId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ itemNo: '', type: 'EAN13', code: '', name: '', event: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const touchStartX = useRef<number | null>(null)

  // 換了一個商品（或第一次打開）就重置表單，比照 React 官方建議的
  // 「render 當下直接調整 state」寫法，不用 effect（避免多一次 render 的閃爍）
  if (product && product.id !== lastProductId) {
    setLastProductId(product.id)
    setForm({
      itemNo: product.itemNo ?? '',
      type: product.type,
      code: product.code,
      name: product.name,
      event: product.event ?? '',
    })
    setEditing(false)
    setError('')
  }

  async function save() {
    if (!product) return
    setSaving(true)
    setError('')
    try {
      const updated = await api.updateProduct(product.id, {
        itemNo: form.itemNo.trim(),
        type: form.type,
        code: form.code.trim(),
        name: form.name.trim(),
        event: form.event.trim(),
      })
      onUpdated(updated)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失敗')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!product) return
    await api.deleteProduct(product.id)
    onDeleted(product.id)
    onOpenChange(false)
  }

  const currentIndex = product ? list.findIndex(p => p.id === product.id) : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < list.length - 1

  function goTo(delta: number) {
    if (currentIndex < 0) return
    const next = list[currentIndex + delta]
    if (next) onNavigate?.(next)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return
    // 往左滑（手勢往左）看下一筆，往右滑看上一筆
    goTo(deltaX < 0 ? 1 : -1)
  }

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs" showCloseButton={false}>
        <DialogTitle className="sr-only">商品詳情</DialogTitle>
        <DialogClose asChild>
          <Button variant="ghost" size="icon-sm" className="absolute top-0 right-0">
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>

        {product && !editing && (
          <div
            className="relative flex flex-col items-center gap-2 py-2"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {hasPrev && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => goTo(-1)}
                className="absolute top-1/2 left-0 -translate-y-1/2 rounded-full bg-muted/80 text-muted-foreground hover:bg-muted"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
            )}
            {hasNext && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => goTo(1)}
                className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full bg-muted/80 text-muted-foreground hover:bg-muted"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            )}
            {product.itemNo && <p className="text-xs text-muted-foreground">品號 {product.itemNo}</p>}
            <p className="text-center text-sm font-medium">{product.name}</p>
            <div className="mt-2 w-full rounded-lg bg-white p-3">
              <ProductBarcode product={product} height={90} width={2.5} fontSize={16} />
            </div>
            <div className="mt-2 flex w-full gap-2">
              <Button
                variant="outline"
                onClick={() => setEditing(true)}
                className="h-auto flex-1 gap-1.5 rounded-xl py-2 text-sm font-normal"
              >
                <PencilIcon className="size-3.5" /> 編輯
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-auto flex-1 gap-1.5 rounded-xl py-2 text-sm font-normal text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon className="size-3.5" /> 刪除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>刪除「{product.name}」？</AlertDialogTitle>
                    <AlertDialogDescription>
                      會一併移除大家對這個商品的常用／砍貨標記，此操作無法復原。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={remove}>刪除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {product && editing && (
          <div className="flex flex-col gap-2 py-2">
            <Input
              value={form.itemNo}
              onChange={e => setForm(f => ({ ...f, itemNo: e.target.value }))}
              placeholder="品號"
            />
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="條碼"
            />
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="名稱"
            />
            <Input
              value={form.event}
              onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
              placeholder="備註（選填）"
            />
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{error}</p>}
            <div className="mt-1 flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)} className="h-auto flex-1 rounded-xl py-2 text-sm font-normal">
                取消
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="h-auto flex-1 rounded-xl bg-amber-400 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {saving ? '儲存中…' : '儲存'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
