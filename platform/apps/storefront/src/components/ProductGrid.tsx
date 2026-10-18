"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { listProducts, type MedusaProduct } from "@/lib/medusa"
import ProductCard from "./ProductCard"

const PAGE_SIZE = 24
const MAX_AUTO_BATCHES = 4

function SkeletonCard() {
  return (
    <div className="bg-surface border border-black/[.09] rounded overflow-hidden">
      <div className="aspect-square shimmer" />
      <div className="p-2 space-y-1">
        <div className="h-3 w-5/6 shimmer rounded" />
        <div className="h-3 w-2/3 shimmer rounded" />
      </div>
    </div>
  )
}

export default function ProductGrid({ initialProducts, initialCount }: {
  initialProducts: MedusaProduct[]
  initialCount: number
}) {
  const [products, setProducts] = useState(initialProducts)
  const [offset, setOffset] = useState(initialProducts.length)
  const count = initialCount
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState(1)
  const showMoreButton = batches >= MAX_AUTO_BATCHES && offset < count
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || offset >= count) return
    setLoading(true)
    try {
      const { products: next } = await listProducts({ limit: PAGE_SIZE, offset })
      setProducts((prev) => [...prev, ...next])
      setOffset((prev) => prev + next.length)
      setBatches((prev) => prev + 1)
    } finally {
      setLoading(false)
    }
  }, [loading, offset, count])

  useEffect(() => {
    if (showMoreButton) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: "300px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, showMoreButton])

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-2.5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
      </div>

      {!showMoreButton && offset < count && <div ref={sentinelRef} className="h-1" />}

      {showMoreButton && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            className="px-6 py-2 border border-brand text-brand rounded font-semibold hover:bg-brand hover:text-white transition-colors"
          >
            Ver Mais
          </button>
        </div>
      )}
    </div>
  )
}
