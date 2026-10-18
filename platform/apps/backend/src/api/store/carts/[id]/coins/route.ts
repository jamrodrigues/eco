import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { STORE_COINS_MODULE } from "../../../../../modules/store-coins"
import { getBalance, listLedger } from "../../../../../modules/store-coins/ledger"

/**
 * GET /store/carts/:id/coins — saldo + extrato recente do cliente
 * vinculado a este carrinho.
 *
 * Por que "cart-scoped" e não "/store/customers/me/coins": esta loja
 * ainda não tem sessão autenticada real no funil de compra (guest
 * customer via POST .../guest-customer, ver Fase 3) — um endpoint "me"
 * de verdade precisa de contexto de auth (JWT) que o checkout não usa
 * ainda. Expor por customer_id direto seria divulgação de dado de
 * outro cliente; escopar pelo cart_id (que só quem está naquele
 * carrinho conhece) é o meio-termo seguro até existir login real aqui.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartModuleService = req.scope.resolve(Modules.CART)
  const storeCoinsService: any = req.scope.resolve(STORE_COINS_MODULE)

  const cart = await cartModuleService.retrieveCart(req.params.id)
  if (!cart.customer_id) {
    return res.status(200).json({ coins_balance: 0, ledger: [] })
  }

  const [balance, ledger] = await Promise.all([
    getBalance(storeCoinsService, cart.customer_id),
    listLedger(storeCoinsService, cart.customer_id, 20),
  ])

  res.status(200).json({ coins_balance: balance, ledger })
}
