'use client'

import { useState } from 'react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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
import { ProductBarcode } from './product-card'
import * as api from '@/lib/api'
import type { Product } from '@/lib/types'

const TYPE_OPTIONS = ['EAN13', 'EAN8', 'CODE128', 'UPCA', 'UPCE']

interface ProductDetailDialogProps {
  product: Product | null
  onOpenChange: (open: boolean) => void
  onUpdated: (product: Product) => void
  onDeleted: (productId: string) => void
}

export function ProductDetailDialog({ product, onOpenChange, onUpdated, onDeleted }: ProductDetailDialogProps) {
  const [lastProductId, setLastProductId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ itemNo: '', type: 'EAN13', code: '', name: '', event: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogTitle className="sr-only">商品詳情</DialogTitle>

        {product && !editing && (
          <div className="flex flex-col items-center gap-2 py-2">
            {product.itemNo && <p className="text-xs text-muted-foreground">品號 {product.itemNo}</p>}
            <p className="text-center text-sm font-medium">{product.name}</p>
            <div className="mt-2 w-full rounded-lg bg-white p-3">
              <ProductBarcode product={product} height={90} width={2.5} fontSize={16} />
            </div>
            <div className="mt-2 flex w-full gap-2">
              <button
                onClick={() => setEditing(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm hover:bg-muted/50"
              >
                <PencilIcon className="size-3.5" /> 編輯
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm text-destructive hover:bg-destructive/10">
                    <Trash2Icon className="size-3.5" /> 刪除
                  </button>
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
            <input
              value={form.itemNo}
              onChange={e => setForm(f => ({ ...f, itemNo: e.target.value }))}
              placeholder="品號"
              className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
            />
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
            >
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="條碼"
              className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
            />
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="名稱"
              className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
            />
            <input
              value={form.event}
              onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
              placeholder="備註（選填）"
              className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
            />
            {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{error}</p>}
            <div className="mt-1 flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border py-2 text-sm hover:bg-muted/50">
                取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl bg-amber-400 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
