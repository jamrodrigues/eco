import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { STORE_COINS_MODULE } from "../modules/store-coins"
import { creditCoins, centsToCoins, getSettings } from "../modules/store-coins/ledger"

/**
 * Cashback automático: credita `cashback_percent`% do total pago em
 * moedas assim que o pedido é colocado (order.placed — disparado por
 * POST /store/carts/:id/complete). Ignora pedidos sem customer_id real
 * (ex: nenhum, já que todo carrinho que chega aqui passou pelo
 * guest-customer endpoint) e não duplica se o evento for reprocessado
 * (reference_id = order id, checa antes de creditar de novo).
 */
export default async function orderPlacedCashbackHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeCoinsService: any = container.resolve(STORE_COINS_MODULE)

  const { data: orders } = await query.graph({
    entity: "order",
    filters: { id: data.id },
    fields: ["id", "customer_id", "total", "currency_code"],
  })
  const order = orders[0]
  if (!order?.customer_id) return

  const settings = await getSettings(storeCoinsService)
  if (!settings.cashback_percent || settings.cashback_percent <= 0) return

  const existing = await storeCoinsService.listCoinTransactions({
    type: "purchase_cashback",
    reference_id: order.id,
  })
  if (existing.length > 0) return // já creditado (evento reprocessado)

  const cashbackCents = Math.round((Number(order.total) * settings.cashback_percent) / 100)
  const cashbackCoins = centsToCoins(cashbackCents, settings)
  if (cashbackCoins <= 0) return

  await creditCoins(storeCoinsService, {
    customerId: order.customer_id,
    coins: cashbackCoins,
    type: "purchase_cashback",
    referenceId: order.id,
    note: `${settings.cashback_percent}% de cashback sobre pedido ${order.id}`,
    settings,
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
