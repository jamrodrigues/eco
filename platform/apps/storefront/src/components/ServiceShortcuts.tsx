import Link from "next/link"
import { brandConfig } from "@/config/brand.config"
import MaterialIcon from "./MaterialIcon"

const defaultItems = [
  { icon: "monetization_on", label: brandConfig.coinsLabel, href: "/conta?tab=moedas" },
  { icon: "confirmation_number", label: "Cupons", href: "/institucional/pagamento" },
  { icon: "local_shipping", label: "Frete Grátis", href: "/institucional/entrega" },
  { icon: "bolt", label: "Ofertas Relâmpago", href: "/#ofertas" },
  { icon: "verified", label: "Lojas Oficiais", href: "/busca" },
]

export default function ServiceShortcuts() {
  const items = brandConfig.serviceShortcuts ?? defaultItems
  const columns = Math.ceil(items.length / 2)
  return (
    <section className="w-full max-w-container mx-auto px-4 mt-3">
      <div
        className="grid gap-x-2 gap-y-3 justify-items-center md:flex md:justify-between md:gap-0"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: "repeat(2, auto)",
          gridAutoFlow: "column",
        }}
      >
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-1 w-20"
          >
            <div className="w-10 h-10 rounded-full bg-surface border border-black/[.09] flex items-center justify-center">
              <MaterialIcon name={item.icon} className="text-xl text-brand" />
            </div>
            <span className="text-[11px] text-textSecondary text-center leading-tight">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
