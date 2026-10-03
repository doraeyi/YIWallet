// 很小的全域提示訊息：任何地方呼叫 toast() 都會顯示在 <Toaster /> 裡，幾秒後自動消失。
// 專案沒有裝 toast 套件，需求也只有「成功／失敗一句話」，自己寫比較輕。

export type ToastKind = 'success' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  action?: ToastAction
}

type Listener = (items: ToastItem[]) => void

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l(items)
}

// action 用在「已改成早班・復原」這種可以撤銷的提示，有 action 的提示停久一點讓人來得及按
export function toast(message: string, kind: ToastKind = 'success', action?: ToastAction) {
  const id = nextId++
  items = [...items, { id, kind, message, action }]
  emit()
  setTimeout(() => dismissToast(id), action ? 5000 : kind === 'error' ? 4000 : 2500)
}

export function dismissToast(id: number) {
  items = items.filter(t => t.id !== id)
  emit()
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  listener(items)
  return () => { listeners.delete(listener) }
}
