import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { applySoldCount } from "../modules/product-stats/sold-count"

/**
 * Soma a quantidade vendida de cada produto do pedido em metadata.sold_count.
 * Idempotente por pedido (ver applySoldCount).
 */
export default async function orderPlacedSoldCountHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  await applySoldCount(
    {
      query: container.resolve(ContainerRegistrationKeys.QUERY),
      productService: container.resolve(Modules.PRODUCT) as any,
      orderService: container.resolve(Modules.ORDER) as any,
    },
    data.id
  )
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
