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
  /** Opcional — quando ausente, ServiceShortcuts usa a lista genérica. */
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
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Vruumoto",
  storeTagline: "Peça certa. Rápido. Entrega expressa pro motoboy e pro moto cliente.",
  officialBadgeLabel: "ORIGINAL",
  coinsLabel: "Moedas Vruum",
  guaranteeTitle: "Garantia Vruumoto",
  guaranteeDescription:
    "Peça 100% compatível com a sua moto ou devolução gratuita em até 7 dias.",
  theme: {
    primaryHex: "#FF5A1F",
    headerGradientStart: "#E8440A",
    headerGradientEnd: "#FF7A33",
    secondaryLightBg: "rgba(255, 90, 31, 0.08)",
  },
  features: {
    enableVehicleFitmentFilter: true,
    enableOemPartNumberSearch: true,
    enableHyperlocalCityBadge: true,
    enablePwaInstallPrompt: true,
  },
  logoImagePath: "/icons/vruumoto-logo-source.png",
  serviceShortcuts: [
    { icon: "⛓️", label: "Kit Relação" },
    { icon: "🛞", label: "Pneus & Câmaras" },
    { icon: "🪖", label: "Capacetes & Jaquetas" },
    { icon: "🛢️", label: "Óleos & Filtros" },
    { icon: "🛑", label: "Freios" },
    { icon: "⚡", label: "Entrega Expressa Motoboy" },
  ],
  legalName: "Vrumm Motos",
  cnpj: "69.233.612/0001-20",
  address: "Avenida em Projeto, 08, Recanto da Poesia, Satuba - AL, CEP 57120-000",
  supportEmail: "contato@vruumoto.com.br",
  developedByLabel: "Desenvolvido por astrealabs.com.br",
  developedByUrl: "https://astrealabs.com.br",
}
