import type { Metadata, Viewport } from "next"
import "./globals.css"
import { brandConfig } from "@/config/brand.config"
import ViewportSimulatorToggle from "@/components/ViewportSimulatorToggle"
import CookieConsentBanner from "@/components/CookieConsentBanner"
import PwaRegister from "@/components/PwaRegister"

export const metadata: Metadata = {
  title: brandConfig.storeName,
  description: brandConfig.storeTagline,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brandConfig.storeName,
  },
  icons: {
    icon: ["/icons/icon-192.png", "/icons/icon-512.png"],
    apple: "/icons/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: brandConfig.theme.primaryHex,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full" style={{ colorScheme: "light" }}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0"
        />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-textPrimary font-sans">
        <main className="viewport-sim-root flex-1 flex flex-col">{children}</main>
        <ViewportSimulatorToggle />
        <CookieConsentBanner />
        <PwaRegister />
      </body>
    </html>
  )
}
