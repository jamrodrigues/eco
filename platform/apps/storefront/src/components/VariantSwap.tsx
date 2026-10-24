"use client"

import { useEffect, useState } from "react"
import { getProductByHandle, type ProductDetail } from "@/lib/medusa"

export default function VariantSwap({
  productHandle,
  currentVariantId,
  currentVariantTitle,
  onSwap,
}: {
  productHandle: string
  currentVariantId: string
  currentVariantTitle: string
  onSwap: (newVariantId: string) => void
}) {
  const [product, setProduct] = useState<ProductDetail | null>(null)

  useEffect(() => {
    getProductByHandle(productHandle).then(setProduct).catch(() => {})
  }, [productHandle])

  if (!product || product.variants.length <= 1) {
    return <p className="text-xs text-textSecondary">Variação: {currentVariantTitle}</p>
  }

  return (
    <label className="text-xs text-textSecondary flex items-center gap-1 min-w-0">
      <span className="shrink-0">Variação:</span>
      <select
        value={currentVariantId}
        onChange={(e) => {
          if (e.target.value !== currentVariantId) onSwap(e.target.value)
        }}
        className="border border-black/[.09] rounded px-1.5 py-0.5 text-xs min-w-0 max-w-full flex-1 truncate"
      >
        {product.variants.map((v) => (
          <option key={v.id} value={v.id} disabled={v.inventory_quantity === 0}>
            {v.title}
            {v.inventory_quantity === 0 ? " (esgotado)" : ""}
          </option>
        ))}
      </select>
    </label>
  )
}
