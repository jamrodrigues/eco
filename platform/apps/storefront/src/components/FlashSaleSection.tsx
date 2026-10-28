import Link from "next/link"
import type { MedusaProduct } from "@/lib/medusa"
import FlashSaleCountdown from "./FlashSaleCountdown"
import { deterministicInRange, formatBRL } from "@/lib/medusa"

const SALE_DURATION_MS = 2 * 60 * 60 * 1000 // 2h de simulação

export default function FlashSaleSection({ products }: { products: MedusaProduct[] }) {
  const items = products.slice(0, 6)

  return (
    <section className="w-full max-w-container mx-auto px-4 mt-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-brand font-bold text-lg">⚡ Ofertas Relâmpago</h2>
        <FlashSaleCountdown durationMs={SALE_DURATION_MS} />
      </div>
      <div className="flex gap-2.5 overflow-x-auto snap-x">
        {items.map((product) => {
          const price = product.variants?.[0]?.calculated_price?.calculated_amount ?? 0
          const sold = deterministicInRange(product.id, 60, 99)
          return (
            <Link
              key={product.id}
              href={`/produto/${product.handle}`}
              className="snap-start shrink-0 w-[45%] md:w-[160px] bg-surface border border-black/[.09] rounded overflow-hidden"
            >
              <div className="aspect-square bg-canvas relative">
                {product.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.thumbnail}
                    alt={product.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-textSecondary">
                    <span className="text-2xl">📦</span>
                    <span className="text-[10px]">Sem foto</span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-brand font-extrabold text-sm">{formatBRL(price)}</p>
                <div className="mt-1 h-2 rounded-full bg-brand/15 relative overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${sold}%` }}
                  />
                </div>
                <p className="text-[10px] text-textSecondary mt-0.5">
                  🔥 {sold}% VENDIDOS
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
