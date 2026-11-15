import Link from "next/link"
import type { MedusaProduct } from "@/lib/medusa"
import FlashSaleCountdown from "./FlashSaleCountdown"
import { formatBRL } from "@/lib/medusa"
import { discountPercent } from "@/lib/social-proof"
import MaterialIcon from "./MaterialIcon"

export default function FlashSaleSection({
  title,
  endsAt,
  products,
}: {
  title: string
  endsAt: string
  products: MedusaProduct[]
}) {
  const items = products.slice(0, 6)

  return (
    <section className="w-full max-w-container mx-auto px-4 mt-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-brand font-bold text-lg flex items-center gap-1">
          <MaterialIcon name="bolt" /> {title || "Ofertas Relâmpago"}
        </h2>
        <FlashSaleCountdown endsAt={endsAt} />
      </div>
      <div className="flex gap-2.5 overflow-x-auto snap-x">
        {items.map((product) => {
          const variant = product.variants?.[0]
          const price = variant?.calculated_price?.calculated_amount ?? 0
          const original = variant?.calculated_price?.original_amount
          const discount = discountPercent(price, original)
          const stock = variant?.inventory_quantity
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
                    <MaterialIcon name="hide_image" className="text-2xl" />
                    <span className="text-[10px]">Sem foto</span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-brand font-extrabold text-sm">{formatBRL(price)}</p>
                {discount > 0 && (
                  <p className="text-xs text-textSecondary">
                    <span className="line-through">{formatBRL(original ?? price)}</span>{" "}
                    <span className="text-brand font-bold">-{discount}%</span>
                  </p>
                )}
                {stock !== undefined && stock > 0 && stock <= 10 && (
                  <p className="text-[10px] text-textSecondary mt-0.5">Restam {stock}</p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
