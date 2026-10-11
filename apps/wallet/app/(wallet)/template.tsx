// template 每次換頁都會重新掛載，用來做頁面切換的淡入（layout 不會重掛，做不到）。
// 只淡入、很短：換頁要的是連貫，不是每頁都表演一次進場
export default function WalletTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col animate-fade">{children}</div>
}
