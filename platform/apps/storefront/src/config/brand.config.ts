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
