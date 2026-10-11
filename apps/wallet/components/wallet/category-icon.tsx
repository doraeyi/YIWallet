import { createElement } from 'react'
import {
  BabyIcon, BeerIcon, BriefcaseIcon, CakeIcon, CameraIcon, CigaretteIcon, CreditCardIcon, DumbbellIcon,
  FilmIcon, FlowerIcon, GraduationCapIcon, HeadphonesIcon, HeartIcon, LaptopIcon, MusicIcon, PizzaIcon,
  PlaneIcon, ScissorsIcon, StoreIcon, TicketIcon, TrainFrontIcon, TreePalmIcon, UmbrellaIcon, WrenchIcon,
  ArrowLeftRightIcon, BadgeDollarSignIcon, BikeIcon, BookOpenIcon, Building2Icon, BusIcon, ChartColumnIcon,
  CoffeeIcon, CoinsIcon, CookieIcon, CroissantIcon, GiftIcon, Gamepad2Icon, HandshakeIcon, HouseIcon,
  LayoutGridIcon, PawPrintIcon, PiggyBankIcon, ShieldCheckIcon, ShirtIcon, ShoppingBagIcon,
  ShoppingCartIcon, SmartphoneIcon, SoupIcon, SparklesIcon, StethoscopeIcon, UtensilsCrossedIcon,
  UtensilsIcon, WalletIcon, WineIcon, ZapIcon, type LucideIcon,
} from 'lucide-react'
import { getCategoryById } from '@/lib/types'
import { cn } from '@/lib/utils'

// 圖示 key → 線條圖示。內建分類的 key 就是分類 id；自訂分類存自己選的 key（Category.icon）。
// 新增內建分類時在 lib/types.ts 的 CATEGORIES 加資料、這裡加圖示
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
  // 只給自訂分類選的
  plane: PlaneIcon,
  travel: TreePalmIcon,
  heart: HeartIcon,
  music: MusicIcon,
  headphones: HeadphonesIcon,
  film: FilmIcon,
  ticket: TicketIcon,
  baby: BabyIcon,
  fitness: DumbbellIcon,
  train: TrainFrontIcon,
  beer: BeerIcon,
  pizza: PizzaIcon,
  cake: CakeIcon,
  smoke: CigaretteIcon,
  haircut: ScissorsIcon,
  repair: WrenchIcon,
  laptop: LaptopIcon,
  camera: CameraIcon,
  store: StoreIcon,
  card: CreditCardIcon,
  school: GraduationCapIcon,
  work: BriefcaseIcon,
  flower: FlowerIcon,
  umbrella: UmbrellaIcon,
}

// 自訂分類可以選的圖示（全部都列出來，內建分類用的也能選）
export const ICON_CHOICES = Object.keys(ICONS)

// 自訂分類可以選的顏色：[底色, 圖示色]
export const COLOR_CHOICES: [string, string][] = [
  ['#FEF3C7', '#B45309'], ['#FFEDD5', '#C2410C'], ['#FEE2E2', '#DC2626'], ['#FCE7F3', '#BE185D'],
  ['#F3E8FF', '#7E22CE'], ['#E0E7FF', '#4338CA'], ['#DBEAFE', '#2563EB'], ['#CFFAFE', '#0891B2'],
  ['#CCFBF1', '#0F766E'], ['#DCFCE7', '#16A34A'], ['#ECFCCB', '#4D7C0F'], ['#E5E7EB', '#4B5563'],
]

// 分類的線條圖示本身（用 createElement 而不是 <Icon />，查表拿到的元件不能在 render 裡當 JSX 標籤）
// id 是分類 id；挑圖示時直接給圖示 key 也行（iconKey）
export function CategoryGlyph({ id, iconKey, className, strokeWidth = 2 }: {
  id?: string
  iconKey?: string
  className?: string
  strokeWidth?: number
}) {
  const key = iconKey ?? (id ? (getCategoryById(id)?.icon ?? id) : '')
  return createElement(ICONS[key] ?? LayoutGridIcon, { className, strokeWidth })
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
