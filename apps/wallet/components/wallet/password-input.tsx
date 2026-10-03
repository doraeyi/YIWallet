'use client'

import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'

// 密碼欄位右邊加「顯示／隱藏」按鈕，手機上打錯比較容易發現
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className="w-full rounded-xl border bg-muted/30 py-2.5 pl-3 pr-10 text-sm outline-none focus:border-ring"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? '隱藏密碼' : '顯示密碼'}
        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  )
}
