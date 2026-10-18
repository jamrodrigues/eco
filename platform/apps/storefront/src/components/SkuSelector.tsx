"use client"

import type { ProductDetail } from "@/lib/medusa"
import { isOptionValueAvailable } from "@/lib/medusa"

export default function SkuSelector({
  product,
  selection,
  onSelect,
}: {
  product: ProductDetail
  selection: Record<string, string>
  onSelect: (optionTitle: string, value: string) => void
}) {
  return (
    <div className="space-y-3">
      {product.options.map((option) => (
        <div key={option.id}>
          <p className="text-xs text-textSecondary mb-1.5">{option.title}</p>
          <div className="flex flex-wrap gap-2">
            {option.values.map(({ value }) => {
              const isSelected = selection[option.title] === value
              const available = isOptionValueAvailable(
                product,
                selection,
                option.title,
                value
              )

              if (!available) {
                return (
                  <button
                    key={value}
                    type="button"
                    disabled
                    data-testid={`option-${option.title}-${value}`}
                    className="px-3 py-1.5 text-sm rounded border border-dashed border-gray-300 bg-canvas text-gray-300 cursor-not-allowed"
                  >
                    {value}
                  </button>
                )
              }

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSelect(option.title, value)}
                  data-testid={`option-${option.title}-${value}`}
                  className={`relative px-3 py-1.5 text-sm rounded border transition-colors ${
                    isSelected
                      ? "border-brand text-brand font-semibold"
                      : "border-black/[.09] text-textPrimary hover:border-brand"
                  }`}
                >
                  {value}
                  {isSelected && (
                    <span
                      className="check-triangle absolute bottom-0 right-0 w-0 h-0"
                      style={{
                        borderStyle: "solid",
                        borderWidth: "0 0 14px 14px",
                        borderColor: "transparent transparent #EE4D2D transparent",
                      }}
                    >
                      <span className="absolute -bottom-[13px] -right-0 text-white text-[8px]">
                        ✓
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
