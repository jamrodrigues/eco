import type { Config } from "tailwindcss"

/**
 * Design tokens do funil (Fase 2 / @FrontendShopee). Os valores de cor e
 * densidade replicam exatamente o benchmark de UX inspecionado no
 * relatorio tecnico; os NOMES dos tokens sao neutros de marca (o nome da
 * loja, cores de tema e textos reais vêm de src/config/brand.config.ts).
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
          DEFAULT: "#EE4D2D",
          light: "#FFF5F1",
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
        "header-gradient": "linear-gradient(-180deg, #F53D2D, #FF6633)",
      },
    },
  },
  plugins: [],
}

export default config
