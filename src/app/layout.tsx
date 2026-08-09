import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans_Thai } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { CatWalker } from "@/components/layout/cat-walker";
import { Providers } from "@/components/layout/providers";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-app", display: "swap" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — คาเฟ่เครื่องมือออนไลน์ใช้ฟรี`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "th_TH", siteName: siteConfig.name, title: siteConfig.name, description: siteConfig.description },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf7f0" }, { media: "(prefers-color-scheme: dark)", color: "#1d1c1a" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsEnabled = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED === "true";
  return (
    <html lang="th" suppressHydrationWarning data-scroll-behavior="smooth" className={`${notoSansThai.variable} ${jetBrainsMono.variable}`}>
      <body className={`${notoSansThai.className} min-h-dvh bg-background antialiased`}>
        <Providers>
          <div className="meaw-app-content relative z-20 flex min-h-dvh flex-col">
            <AppHeader />
            <main id="main-content" className="flex-1">{children}</main>
            <AppFooter />
          </div>
          <CatWalker />
          <Toaster position="top-right" richColors closeButton />
        </Providers>
        {analyticsEnabled ? <Analytics /> : null}
      </body>
    </html>
  );
}
