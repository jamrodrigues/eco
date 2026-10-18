import type { MetadataRoute } from "next"
import { brandConfig } from "@/config/brand.config"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandConfig.storeName,
    short_name: brandConfig.storeName,
    description: brandConfig.storeTagline,
    start_url: "/",
    display: "standalone",
    background_color: "#F5F5F5",
    theme_color: brandConfig.theme.primaryHex,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
