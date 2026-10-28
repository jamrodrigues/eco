import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const VARIANT_FIELDS = [
  "id",
  "title",
  "sku",
  "metadata",
  "product.title",
  "prices.amount",
  "prices.currency_code",
  "inventory_items.inventory_item_id",
  "inventory_items.inventory.location_levels.stocked_quantity",
  "inventory_items.inventory.location_levels.reserved_quantity",
  "inventory_items.inventory.location_levels.location_id",
]

/**
 * GET /admin/pdv/lookup?sku=VESTIDO-MIDI-LOVITO-PRE-P
 *
 * Leitor de código de barras do PDV: busca a variação exata pelo SKU e
 * retorna preço + estoque disponível na Loja Física Matriz
 * (@POSHyperlocal, Fase 4). Na Fase 5 (Vruumoto), quando o SKU não bate
 * direto, também tenta por Código OEM ou EAN (metadata da variante —
 * ver src/modules/motorcycle-fitment).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const code = String(req.query.sku || "").trim()
  if (!code) {
    return res.status(400).json({ message: "Informe ?sku=" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const matriz = locations.find((l: any) => l.name.startsWith("Loja Física Matriz"))
  if (!matriz) {
    return res.status(500).json({ message: "Stock Location Matriz não encontrado." })
  }

  const { data: bySku } = await query.graph({
    entity: "product_variant",
    fields: VARIANT_FIELDS,
    filters: { sku: code },
  })

  let variant = bySku[0] as any

  if (!variant) {
    // Fallback: codigo OEM ou EAN de barras (nao e um campo filtravel
    // nativamente, entao varre as variantes e compara o metadata).
    const { data: all } = await query.graph({
      entity: "product_variant",
      fields: VARIANT_FIELDS,
    })
    variant = (all as any[]).find(
      (v) =>
        v.metadata?.oem_part_number === code || v.metadata?.ean_barcode === code
    )
  }

  if (!variant) {
    return res.status(404).json({ message: `Código "${code}" não encontrado.` })
  }

  const priceRow = (variant.prices || []).find((p: any) => p.currency_code === "brl")
  const levels =
    variant.inventory_items?.[0]?.inventory?.location_levels || []
  const matrizLevel = levels.find((l: any) => l.location_id === matriz.id)
  const available = matrizLevel
    ? matrizLevel.stocked_quantity - matrizLevel.reserved_quantity
    : 0

  res.status(200).json({
    variant_id: variant.id,
    product_title: variant.product?.title,
    variant_title: variant.title,
    sku: variant.sku,
    unit_price: priceRow?.amount ?? 0,
    stock_location_id: matriz.id,
    available_quantity: available,
  })
}
