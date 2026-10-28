import { brandConfig } from "@/config/brand.config"

const items = [
  { icon: "monetization_on", label: brandConfig.coinsLabel },
  { icon: "confirmation_number", label: "Cupons" },
  { icon: "local_shipping", label: "Frete Grátis" },
  { icon: "bolt", label: "Ofertas Relâmpago" },
  { icon: "verified", label: "Lojas Oficiais" },
]

export default function ServiceShortcuts() {
  return (
    <section className="w-full max-w-container mx-auto px-4 mt-3">
      <div className="flex md:justify-between gap-4 md:gap-0 overflow-x-auto md:overflow-visible pb-1">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1 shrink-0 w-20 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-surface border border-black/[.09] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] leading-none">{item.icon}</span>
            </div>
            <span className="text-[11px] text-textSecondary text-center leading-tight">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
