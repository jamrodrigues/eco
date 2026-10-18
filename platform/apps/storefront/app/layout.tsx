import type { Metadata } from "next"
import "./globals.css"
import { brandConfig } from "@/config/brand.config"
import ViewportSimulatorToggle from "@/components/ViewportSimulatorToggle"

export const metadata: Metadata = {
  title: brandConfig.storeName,
  description: brandConfig.storeTagline,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full" style={{ colorScheme: "light" }}>
      <body className="min-h-full flex flex-col bg-canvas text-textPrimary font-sans">
        <main className="viewport-sim-root flex-1 flex flex-col">{children}</main>
        <ViewportSimulatorToggle />
      </body>
    </html>
  )
}
