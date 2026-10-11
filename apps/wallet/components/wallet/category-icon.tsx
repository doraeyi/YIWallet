import { createElement } from 'react'
import {
  ArrowLeftRightIcon, BadgeDollarSignIcon, BikeIcon, BookOpenIcon, Building2Icon, BusIcon, ChartColumnIcon,
  CoffeeIcon, CoinsIcon, CookieIcon, CroissantIcon, GiftIcon, Gamepad2Icon, HandshakeIcon, HouseIcon,
  LayoutGridIcon, PawPrintIcon, PiggyBankIcon, ShieldCheckIcon, ShirtIcon, ShoppingBagIcon,
  ShoppingCartIcon, SmartphoneIcon, SoupIcon, SparklesIcon, StethoscopeIcon, UtensilsCrossedIcon,
  UtensilsIcon, WalletIcon, WineIcon, ZapIcon, type LucideIcon,
} from 'lucide-react'
import { getCategoryById } from '@/lib/types'
import { cn } from '@/lib/utils'

// 分類 id → 線條圖示。新增分類時在 lib/types.ts 的 CATEGORIES 加資料、這裡加圖示
const ICONS: Record<string, LucideIcon> = {
  breakfast: CroissantIcon,
  lunch: SoupIcon,
  dinner: UtensilsCrossedIcon,
  drink: CoffeeIcon,
  snack: CookieIcon,
  alcohol: WineIcon,
  transport: BusIcon,
  car: BikeIcon,
  shopping: ShoppingBagIcon,
  clothing: ShirtIcon,
  daily: ShoppingCartIcon,
  entertainment: Gamepad2Icon,
  rent: HouseIcon,
  utilities: ZapIcon,
  phone: SmartphoneIcon,
  health: StethoscopeIcon,
  education: BookOpenIcon,
  beauty: SparklesIcon,
  pet: PawPrintIcon,
  gift: GiftIcon,
  insurance: ShieldCheckIcon,
  transfer: ArrowLeftRightIcon,
  food: UtensilsIcon,
  salary: WalletIcon,
  bonus: BadgeDollarSignIcon,
  cashback: CoinsIcon,
  trade: HandshakeIcon,
  dividend: ChartColumnIcon,
  rental: Building2Icon,
  investment: PiggyBankIcon,
}

// 分類的線條圖示本身（用 createElement 而不是 <Icon />，查表拿到的元件不能在 render 裡當 JSX 標籤）
export function CategoryGlyph({ id, className, strokeWidth = 2 }: { id: string; className?: string; strokeWidth?: number }) {
  return createElement(ICONS[id] ?? LayoutGridIcon, { className, strokeWidth })
}

// 列表、金額列用的分類徽章：分類色的圓底＋線條圖示
export function CategoryBadge({ id, className }: { id: string; className?: string }) {
  const cat = getCategoryById(id)
  return (
    <span
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', className)}
      style={{ backgroundColor: cat?.color ?? '#E5E7EB', color: cat?.text ?? '#6B7280' }}
      aria-hidden="true"
    >
      <CategoryGlyph id={id} className="size-[55%]" />
    </span>
  )
}
