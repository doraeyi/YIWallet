import Link from 'next/link'
import { BarcodeIcon, BookOpenIcon } from 'lucide-react'

export default function SopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <div className="flex items-center gap-1 border-b bg-background px-4 py-2">
        <Link
          href="/barcode"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <BarcodeIcon className="size-4" /> 條碼查詢
        </Link>
        <Link
          href="/procedures"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <BookOpenIcon className="size-4" /> SOP 查詢
        </Link>
        <a
          href={process.env.NEXT_PUBLIC_WALLET_APP_URL}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          回易記帳
        </a>
      </div>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
