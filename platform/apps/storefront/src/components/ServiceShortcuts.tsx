import { brandConfig } from "@/config/brand.config"

const items = [
  { icon: "🪙", label: brandConfig.coinsLabel },
  { icon: "🎟️", label: "Cupons" },
  { icon: "🚚", label: "Frete Grátis" },
  { icon: "⚡", label: "Ofertas Relâmpago" },
  { icon: "✅", label: "Lojas Oficiais" },
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
            <div className="w-10 h-10 rounded-full bg-surface border border-black/[.09] flex items-center justify-center text-xl">
              {item.icon}
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
