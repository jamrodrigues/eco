/**
 * Contador de "vendidos" por produto (metadata.sold_count).
 *
 * Chamado pelo subscriber order.placed e pelo script de backfill. Idempotente
 * por pedido: marca metadata.sold_counted = true no pedido depois de somar,
 * então reprocessar o mesmo evento não conta duas vezes.
 *
 * ATENÇÃO: productService.updateProducts SUBSTITUI o metadata inteiro do
 * produto — por isso sempre espalhamos o metadata existente antes de gravar.
 */

export type SoldCountDeps = {
  query: { graph: Function }
  productService: {
    retrieveProduct(id: string): Promise<any>
    updateProducts(id: string, data: any): Promise<any>
  }
  orderService: {
    updateOrders(data: any): Promise<any>
  }
}

export type SoldCountResult = { updated: string[]; skipped: boolean }

export async function applySoldCount(
  deps: SoldCountDeps,
  orderId: string
): Promise<SoldCountResult> {
  const { data: orders } = await deps.query.graph({
    entity: "order",
    filters: { id: orderId },
    fields: ["id", "status", "metadata", "items.product_id", "items.quantity"],
  })
  const order = orders?.[0]
  if (!order) return { updated: [], skipped: true }

  if (order.metadata?.sold_counted === true || order.status === "canceled") {
    return { updated: [], skipped: true }
  }

  const quantityByProduct = new Map<string, number>()
  for (const item of order.items ?? []) {
    if (!item?.product_id) continue
    const qty = Number(item.quantity) || 0
    quantityByProduct.set(
      item.product_id,
      (quantityByProduct.get(item.product_id) ?? 0) + qty
    )
  }

  const updated: string[] = []
  for (const [productId, qty] of quantityByProduct) {
    const product = await deps.productService.retrieveProduct(productId)
    const metadata = product?.metadata ?? {}
    await deps.productService.updateProducts(productId, {
      metadata: {
        ...metadata,
        sold_count: (Number(metadata.sold_count) || 0) + qty,
      },
    })
    updated.push(productId)
  }

  await deps.orderService.updateOrders([
    {
      id: order.id,
      metadata: { ...(order.metadata ?? {}), sold_counted: true },
    },
  ])

  return { updated, skipped: false }
}
