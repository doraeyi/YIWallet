import { TransactionsProvider } from '@/contexts/transactions-context'
import { Sidebar } from '@/components/wallet/sidebar'
import { MobileNav } from '@/components/wallet/mobile-nav'
import { LineImportBanner } from '@/components/wallet/line-import-banner'
import { Toaster } from '@/components/ui/toaster'
import { ConfirmHost } from '@/components/ui/confirm-host'
import { OnboardingTour } from '@/components/wallet/onboarding-tour'

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <TransactionsProvider>
      <div className="flex min-h-dvh bg-muted/40">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Page content */}
        {/* 桌機版內容限制最大寬度置中，超寬螢幕不會把列表拉成一長條 */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-24 lg:pb-10">
          <div className="flex w-full flex-1 flex-col lg:mx-auto lg:max-w-6xl lg:px-4 xl:px-8">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />

        {/* LINE Bot 匯入通知 */}
        <LineImportBanner />

        <Toaster />
        <ConfirmHost />

        {/* 新手導覽（剛註冊的人第一次進首頁） */}
        <OnboardingTour />
      </div>
    </TransactionsProvider>
  )
}
