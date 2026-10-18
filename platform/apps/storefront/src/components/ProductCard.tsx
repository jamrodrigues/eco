import Link from "next/link"
import type { MedusaProduct } from "@/lib/medusa"
import { deterministicInRange, formatBRL } from "@/lib/medusa"

export default function ProductCard({ product }: { product: MedusaProduct }) {
  const variant = product.variants?.[0]
  const price = variant?.calculated_price?.calculated_amount ?? 0
  const soldLabel = `${deterministicInRange(product.id, 10, 99) / 10} mil vendidos`

  return (
    <Link
      href={`/produto/${product.handle}`}
      className="group block bg-surface border border-black/[.09] rounded overflow-hidden transition-transform hover:-translate-y-0.5 hover:border-brand"
    >
      <div className="relative aspect-square bg-canvas">
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
        <span className="absolute top-1 left-1 bg-badgeOfficial text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          OFICIAL
        </span>
        <span className="absolute top-1 right-1 bg-badgeDiscount text-[#7A2E0E] text-[10px] font-bold px-1.5 py-0.5 rounded">
          -20%
        </span>
      </div>
      <div className="p-2">
        <p className="text-[12px] leading-4 text-textPrimary line-clamp-2 min-h-[32px]">
          {product.title}
        </p>
        <div className="mt-1">
          <span className="inline-block border border-dashed border-brand text-brand text-[10px] px-1 rounded">
            Cupom R$ 5 OFF
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-brand font-extrabold text-base">{formatBRL(price)}</span>
          <span className="text-textSecondary text-[11px]">{soldLabel}</span>
        </div>
      </div>
    </Link>
  )
}
