/**
 * Contador de "vendidos" por produto (metadata.sold_count).
 *
 * Chamado pelo subscriber order.placed e pelo script de backfill. Idempotente
 * por pedido: marca metadata.sold_counted = true no pedido depois de somar,
 * então reprocessar o mesmo evento não conta duas vezes.
 *
 * ATENÇÃO: productService.updateProducts SUBSTITUI o metadata inteiro do
 * produto — por isso sempre espalhamos o metadata existente antes de gravar.
 *
 * ATENÇÃO 2: buscar o pedido via query.graph com o campo "items.quantity" NÃO
 * funciona — esse campo é calculado pelo próprio Order Module e vem undefined
 * por essa via (confirmado contra o backend real: 3 pedidos "processados" sem
 * erro, mas sold_count ficou em 0). Por isso o pedido é buscado via
 * orderService.retrieveOrder(id, { relations: ["items"] }), que resolve
 * status/metadata/items.quantity corretamente.
 */

export type SoldCountDeps = {
  productService: {
    retrieveProduct(id: string): Promise<any>
    updateProducts(id: string, data: any): Promise<any>
  }
  orderService: {
    retrieveOrder(id: string, config?: any): Promise<any>
    updateOrders(data: any): Promise<any>
  }
}

export type SoldCountResult = { updated: string[]; skipped: boolean }

export async function applySoldCount(
  deps: SoldCountDeps,
  orderId: string
): Promise<SoldCountResult> {
  const order = await deps.orderService.retrieveOrder(orderId, {
    relations: ["items"],
  })
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
