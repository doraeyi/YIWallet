import { TransactionsProvider } from '@/contexts/transactions-context'
import { Sidebar } from '@/components/wallet/sidebar'
import { MobileNav } from '@/components/wallet/mobile-nav'

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <TransactionsProvider>
      <div className="flex min-h-dvh bg-muted/40">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Page content */}
        <main className="flex flex-1 flex-col overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </TransactionsProvider>
  )
}
