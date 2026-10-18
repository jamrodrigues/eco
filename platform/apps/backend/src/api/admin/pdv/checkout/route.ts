import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import crypto from "crypto"

type CheckoutItem = {
  variant_id: string
  sku: string
  quantity: number
  unit_price: number
}

type Body = {
  items: CheckoutItem[]
  payment_method: "pix" | "card" | "cash"
  cash_received?: number
}

/**
 * POST /admin/pdv/checkout
 *
 * Fechamento de balcão do PDV físico: baixa o estoque real na Loja
 * Física Matriz (via `adjustInventory`, ajuste relativo — evita corrida
 * de leitura/escrita entre dois caixas) e devolve o recibo da venda
 * (@POSHyperlocal, Fase 4).
 *
 * Escopo desta fase: gera um recibo de venda presencial e baixa o
 * estoque real; não cria uma Order completa do Medusa (region/customer/
 * fulfillment) — isso fica para quando o PDV precisar aparecer no
 * histórico de pedidos do admin, fora do critério de aceite da Etapa 4
 * (que só verifica a baixa de estoque refletindo no storefront).
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const { items, payment_method, cash_received } = req.body
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (!items?.length) {
    return res.status(400).json({ message: "Cesta vazia." })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const inventoryModuleService = req.scope.resolve(Modules.INVENTORY)

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const matriz = locations.find((l: any) => l.name.startsWith("Loja Física Matriz"))
  if (!matriz) {
    return res.status(500).json({ message: "Stock Location Matriz não encontrado." })
  }

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  if (payment_method === "cash" && (cash_received ?? 0) < total) {
    return res.status(400).json({
      message: `Valor recebido (R$ ${((cash_received ?? 0) / 100).toFixed(2)}) é menor que o total (R$ ${(total / 100).toFixed(2)}).`,
    })
  }

  for (const item of items) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "inventory_items.inventory_item_id"],
      filters: { id: item.variant_id },
    })
    const inventoryItemId = variants[0]?.inventory_items?.[0]?.inventory_item_id
    if (!inventoryItemId) {
      return res.status(404).json({
        message: `Variante ${item.variant_id} sem inventory_item associado.`,
      })
    }

    const level = await inventoryModuleService.adjustInventory(
      inventoryItemId,
      matriz.id,
      -item.quantity
    )

    if (level.stocked_quantity < 0) {
      // Reverte: não deixa estoque negativo por venda simultânea.
      await inventoryModuleService.adjustInventory(inventoryItemId, matriz.id, item.quantity)
      return res.status(409).json({
        message: `Estoque insuficiente para o SKU ${item.sku} na Matriz.`,
      })
    }
  }

  const saleId = `PDV-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
  const change = payment_method === "cash" ? (cash_received ?? 0) - total : 0

  logger.info(`[pdv] Venda de balcão ${saleId}: R$ ${(total / 100).toFixed(2)} via ${payment_method}`)

  res.status(200).json({
    sale_id: saleId,
    items,
    total,
    payment_method,
    cash_received: cash_received ?? null,
    change,
    stock_location_id: matriz.id,
    created_at: new Date().toISOString(),
  })
}
