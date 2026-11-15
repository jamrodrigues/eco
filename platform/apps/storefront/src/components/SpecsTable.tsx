import { brandConfig } from "@/config/brand.config"
import type { ProductDetail, ProductVariantDetail } from "@/lib/medusa"

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = Number((grams / 1000).toFixed(2))
    return `${String(kg).replace(".", ",")} kg`
  }
  return `${grams} g`
}

function formatCompatible(
  list: NonNullable<NonNullable<ProductVariantDetail["metadata"]>["compatible_motorcycles"]>
): string {
  return list
    .map((m) => `${m.make} ${m.model} (${m.year_start}–${m.year_end})`)
    .join("; ")
}

export default function SpecsTable({
  product,
  selectedVariant,
  stock,
}: {
  product: ProductDetail
  selectedVariant?: ProductVariantDetail
  stock: number
}) {
  const fitment = selectedVariant?.metadata
  const category = product.categories?.[0]?.name
  const hasDimensions = Boolean(product.length && product.width && product.height)
  const origin = product.origin_country?.trim()

  // Só entra linha com dado presente — nada de "undefined", "null" ou placeholder.
  const rows: { label: string; value?: string }[] = [
    { label: "Categoria", value: category },
    { label: "Estoque", value: stock > 0 ? `${stock} unidades` : "Esgotado" },
    { label: "SKU", value: selectedVariant?.sku ?? "" },
    { label: "Código OEM", value: fitment?.oem_part_number ?? "" },
    { label: "EAN", value: fitment?.ean_barcode ?? "" },
    {
      label: "Compatível com",
      value: fitment?.compatible_motorcycles?.length
        ? formatCompatible(fitment.compatible_motorcycles)
        : "",
    },
    { label: "Especificação", value: fitment?.viscosity_or_spec ?? "" },
    { label: "Peso", value: product.weight ? formatWeight(product.weight) : "" },
    {
      label: "Dimensões",
      value: hasDimensions
        ? `${product.length} × ${product.width} × ${product.height} cm`
        : "",
    },
    { label: "Material", value: product.material ?? "" },
    {
      label: "Origem",
      value: origin ? (origin.toUpperCase() === "BR" ? "Brasil" : origin.toUpperCase()) : "",
    },
    { label: "Envio de", value: brandConfig.shipsFromLabel ?? "" },
  ].filter((row) => row.value)

  return (
    <div className="bg-surface border border-black/[.09] rounded p-4">
      <h3 className="font-semibold text-sm mb-3">Ficha Técnica</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-black/[.06] last:border-0">
              <td className="py-1.5 text-textSecondary w-40">{row.label}</td>
              <td className="py-1.5">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {product.description && (
        <p className="text-sm text-textPrimary mt-4 whitespace-pre-line">{product.description}</p>
      )}
    </div>
  )
}
