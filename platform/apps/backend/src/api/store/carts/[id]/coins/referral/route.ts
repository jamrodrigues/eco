import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { STORE_COINS_MODULE } from "../../../../../../modules/store-coins"
import { creditCoins } from "../../../../../../modules/store-coins/ledger"

const REFERRAL_BONUS_COINS = 100

/**
 * POST /store/carts/:id/coins/referral — resgate mínimo de indicação:
 * código de indicação = os 8 últimos caracteres do id do indicador.
 * Credita o bônus pros DOIS lados (quem indicou e quem usou o código),
 * uma única vez por cliente indicado (checa se já resgatou algum
 * referral_bonus antes de aceitar outro código).
 *
 * Mantido deliberadamente simples (sem programa de níveis, sem link
 * de indicação dedicado, sem janela de validade) — é o mínimo pra
 * provar o mecanismo, não um sistema de growth completo.
 */
export async function POST(
  req: MedusaRequest<{ referral_code: string }>,
  res: MedusaResponse
) {
  const cartModuleService = req.scope.resolve(Modules.CART)
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const storeCoinsService: any = req.scope.resolve(STORE_COINS_MODULE)

  const cart = await cartModuleService.retrieveCart(req.params.id)
  if (!cart.customer_id) {
    return res.status(400).json({ message: "Carrinho sem cliente vinculado." })
  }

  const code = (req.body.referral_code || "").trim().toUpperCase()
  if (!code) {
    return res.status(400).json({ message: "referral_code é obrigatório." })
  }

  const alreadyUsed = await storeCoinsService.listCoinTransactions({
    customer_id: cart.customer_id,
    type: "referral_bonus",
  })
  if (alreadyUsed.length > 0) {
    return res.status(409).json({ message: "Este cliente já resgatou um código de indicação." })
  }

  const allCustomers = await customerModuleService.listCustomers({}, { take: 1000 })
  const referrer = allCustomers.find(
    (c: any) => c.id.slice(-8).toUpperCase() === code && c.id !== cart.customer_id
  )
  if (!referrer) {
    return res.status(404).json({ message: "Código de indicação inválido." })
  }

  await creditCoins(storeCoinsService, {
    customerId: cart.customer_id,
    coins: REFERRAL_BONUS_COINS,
    type: "referral_bonus",
    referenceId: referrer.id,
    note: `Indicado por ${referrer.email}`,
  })
  await creditCoins(storeCoinsService, {
    customerId: referrer.id,
    coins: REFERRAL_BONUS_COINS,
    type: "referral_bonus",
    referenceId: cart.customer_id,
    note: "Bônus por indicar um novo cliente",
  })

  res.status(200).json({ credited_coins: REFERRAL_BONUS_COINS })
}
