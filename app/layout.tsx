import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "./sw-register"
import { UpdateBanner } from "@/components/wallet/update-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "易記帳",
  description: "簡單好用的個人記帳 App",
  applicationName: "易記帳",
  icons: { icon: '/icons/logo.png', apple: '/icons/logo.png' },
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
            用同步 inline script 而不是 useEffect，因為 useEffect 會晚一拍。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('yiwallet_theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
        <UpdateBanner />
      </body>
    </html>
  );
}
