// template 每次換頁都會重新掛載，用來做頁面切換的進場動畫（layout 不會重掛，做不到）
export default function WalletTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col animate-rise">{children}</div>
}
