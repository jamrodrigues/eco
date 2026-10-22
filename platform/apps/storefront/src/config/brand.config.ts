export interface BrandConfig {
  storeName: string
  storeTagline: string
  officialBadgeLabel: string
  coinsLabel: string
  guaranteeTitle: string
  guaranteeDescription: string
  theme: {
    primaryHex: string
    headerGradientStart: string
    headerGradientEnd: string
    secondaryLightBg: string
  }
  features: {
    enableVehicleFitmentFilter: boolean
    enableOemPartNumberSearch: boolean
    enableHyperlocalCityBadge: boolean
    enablePwaInstallPrompt: boolean
  }
  /** Opcional — quando ausente, o Header mostra o storeName em texto. */
  logoImagePath?: string
  /**
   * Opcional — quando ausente, ServiceShortcuts usa a lista genérica.
   * `icon` e o nome do icone no catalogo Material Symbols
   * (fonts.google.com/icons), renderizado via <MaterialIcon>.
   */
  serviceShortcuts?: { icon: string; label: string }[]
  /**
   * Dados legais/institucionais — opcionais. Quando ausentes (ex: branch
   * `main`, white-label genérico) o Footer não renderiza o bloco legal.
   */
  legalName?: string
  cnpj?: string
  address?: string
  supportEmail?: string
  developedByLabel?: string
  developedByUrl?: string
}

export const brandConfig: BrandConfig = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || "EcoShop Brasil",
  storeTagline: "Frete Grátis, Ofertas Relâmpago e Entrega Rápida na Sua Cidade",
  officialBadgeLabel: "OFICIAL",
  coinsLabel: "Moedas",
  guaranteeTitle: "Garantia Total",
  guaranteeDescription: "Receba seu pedido ou seu dinheiro de volta com segurança.",
  theme: {
    primaryHex: "#EE4D2D",
    headerGradientStart: "#F53D2D",
    headerGradientEnd: "#FF6633",
    secondaryLightBg: "rgba(255, 87, 34, 0.08)",
  },
  features: {
    enableVehicleFitmentFilter: false,
    enableOemPartNumberSearch: false,
    enableHyperlocalCityBadge: true,
    enablePwaInstallPrompt: true,
  },
}
