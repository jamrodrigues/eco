import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/pdv/lookup?sku=VESTIDO-MIDI-LOVITO-PRE-P
 *
 * Leitor de código de barras do PDV: busca a variação exata pelo SKU e
 * retorna preço + estoque disponível na Loja Física Matriz
 * (@POSHyperlocal, Fase 4).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const sku = String(req.query.sku || "").trim()
  if (!sku) {
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

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "sku",
      "product.title",
      "prices.amount",
      "prices.currency_code",
      "inventory_items.inventory_item_id",
      "inventory_items.inventory.location_levels.stocked_quantity",
      "inventory_items.inventory.location_levels.reserved_quantity",
      "inventory_items.inventory.location_levels.location_id",
    ],
    filters: { sku },
  })

  const variant = variants[0] as any
  if (!variant) {
    return res.status(404).json({ message: `SKU "${sku}" não encontrado.` })
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
