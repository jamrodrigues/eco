import type { Config } from "tailwindcss"
import { brandConfig } from "./src/config/brand.config"

/**
 * Design tokens do funil (Fase 2 / @FrontendShopee). Densidade/tipografia
 * replicam exatamente o benchmark de UX inspecionado no relatorio tecnico;
 * a PALETA le de verdade src/config/brand.config.ts (antes desse fix, os
 * hex ficavam hardcoded aqui e brand.config.ts era so decorativo — bug
 * achado na Fase 5 ao trocar a cor da Vruumoto e nada mudar na tela).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: undefined, // light-mode only, de proposito (ver secao 1 do doc da Fase 2)
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: brandConfig.theme.primaryHex,
          light: brandConfig.theme.secondaryLightBg,
        },
        badgeOfficial: "#D0011B",
        badgeDiscount: "#FFD424",
        freeShipping: "#00BFA5",
        pixBadge: "#16A34A",
        canvas: "#F5F5F5",
        surface: "#FFFFFF",
        textPrimary: "#222222",
        textSecondary: "#757575",
      },
      maxWidth: {
        container: "1200px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      spacing: {
        header: "119px",
        headerTopBar: "34px",
        headerMainBar: "85px",
      },
      backgroundImage: {
        "header-gradient": `linear-gradient(-180deg, ${brandConfig.theme.headerGradientStart}, ${brandConfig.theme.headerGradientEnd})`,
      },
    },
  },
  plugins: [],
}

export default config
