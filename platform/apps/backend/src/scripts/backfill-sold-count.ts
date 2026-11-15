/**
 * Backfill de metadata.sold_count a partir de pedidos já existentes.
 * Pedidos já marcados com sold_counted são pulados, então é seguro rodar de novo.
 *
 *   npx medusa exec ./src/scripts/backfill-sold-count.ts
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { applySoldCount } from "../modules/product-stats/sold-count"

export default async function backfillSoldCount({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productService: any = container.resolve(Modules.PRODUCT)
  const orderService: any = container.resolve(Modules.ORDER)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id"],
    filters: { status: { $ne: "canceled" } },
  })

  let updatedOrders = 0
  let skippedOrders = 0
  let failedOrders = 0
  for (const order of orders) {
    try {
      const result = await applySoldCount(
        { productService, orderService },
        order.id
      )
      if (result.skipped) skippedOrders++
      else updatedOrders++
    } catch (err) {
      failedOrders++
      console.error(`[backfill-sold-count] pedido ${order.id} falhou:`, err)
    }
  }

  console.log(
    `[backfill-sold-count] pedidos: ${orders.length} | somados: ${updatedOrders} | pulados: ${skippedOrders} | falhas: ${failedOrders}`
  )
}
