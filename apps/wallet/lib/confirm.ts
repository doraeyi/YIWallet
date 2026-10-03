// App 自己畫的確認視窗，取代瀏覽器內建的 confirm()：
// LINE 內建瀏覽器、加到主畫面的 PWA 可能會擋掉內建確認框（擋掉時 confirm() 直接回 false，
// 按鈕就像沒反應），樣式也跟 App 不搭。用法：if (!(await confirmDialog('確定？'))) return

export interface ConfirmRequest {
  id: number
  message: string
  confirmText: string
  danger: boolean
  resolve: (ok: boolean) => void
}

type Listener = (req: ConfirmRequest | null) => void

let current: ConfirmRequest | null = null
let nextId = 1
const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l(current)
}

export function confirmDialog(
  message: string,
  { confirmText = '確定', danger = false }: { confirmText?: string; danger?: boolean } = {},
): Promise<boolean> {
  // 同時只會有一個確認視窗，前一個沒回答就當作取消
  current?.resolve(false)
  return new Promise(resolve => {
    current = { id: nextId++, message, confirmText, danger, resolve }
    emit()
  })
}

export function answerConfirm(ok: boolean) {
  if (!current) return
  const req = current
  current = null
  emit()
  req.resolve(ok)
}

export function subscribeConfirm(listener: Listener): () => void {
  listeners.add(listener)
  listener(current)
  return () => { listeners.delete(listener) }
}
