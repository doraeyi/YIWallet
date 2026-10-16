import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ServiceWorkerRegistration } from "./sw-register"
import { UpdateBanner } from "@/components/wallet/update-banner";
import { SplashScreen } from "@/components/splash-screen";
import { SITE } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  // 各頁自己的標題會套成「功能介紹｜易記帳 YiWallet」
  title: { default: `${SITE.fullName}｜${SITE.tagline.replace('。', '')}`, template: `%s｜${SITE.fullName}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ['記帳', '記帳App', '自動記帳', 'Apple Pay 記帳', 'LINE Pay 記帳', '信用卡管理', '預算', '班表', '薪水計算', '易記帳', 'YiWallet'],
  // favicon.ico、opengraph-image.png 放在 app/ 底下，Next 會自動加上對應的標籤
  icons: { icon: [{ url: '/icons/logo.png', type: 'image/png' }], apple: '/icons/logo.png' },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    siteName: SITE.fullName,
    title: `${SITE.fullName}｜${SITE.tagline.replace('。', '')}`,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: 'summary_large_image' },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "易記帳",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* 在畫面渲染前先套用深色模式 class，避免先閃一下淺色再變深色（FOUC）。
            用 beforeInteractive 而不是 useEffect，因為 useEffect 會晚一拍。 */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('yiwallet_theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SplashScreen />
        {children}
        <ServiceWorkerRegistration />
        <UpdateBanner />
      </body>
    </html>
  );
}
