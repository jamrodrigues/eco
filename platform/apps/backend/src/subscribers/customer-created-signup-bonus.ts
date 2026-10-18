import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { STORE_COINS_MODULE } from "../modules/store-coins"
import { creditCoins } from "../modules/store-coins/ledger"

const SIGNUP_BONUS_COINS = 100

/**
 * Bônus de cadastro: credita um valor fixo de moedas assim que um novo
 * customer é criado (customer.created). Só dispara quando a criação
 * passa pelo workflow nativo createCustomersWorkflow (que emite o
 * evento) — chamadas diretas a customerModuleService.createCustomers
 * não emitem evento, então rotas que criam customer devem preferir o
 * workflow quando quiserem esse bônus (ver guest-customer/route.ts).
 */
export default async function customerCreatedSignupBonusHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const storeCoinsService: any = container.resolve(STORE_COINS_MODULE)

  const existing = await storeCoinsService.listCoinTransactions({
    type: "signup_bonus",
    reference_id: data.id,
  })
  if (existing.length > 0) return

  await creditCoins(storeCoinsService, {
    customerId: data.id,
    coins: SIGNUP_BONUS_COINS,
    type: "signup_bonus",
    referenceId: data.id,
    note: "Bônus de boas-vindas no cadastro",
  })
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
