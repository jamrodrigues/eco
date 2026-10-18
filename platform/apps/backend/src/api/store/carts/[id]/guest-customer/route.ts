import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const GUEST_CUSTOMER_ID = "cus_guest_dev"
const GUEST_STARTING_COINS = 1000

/**
 * POST /store/carts/:id/guest-customer
 *
 * Fase 3 ainda nao tem fluxo de registro/login real no funil de
 * checkout — isso cria (uma vez) um customer convidado de dev com
 * saldo inicial de moedas e vincula ao carrinho, so para o resgate de
 * moedas funcionar fim-a-fim sem exigir autenticacao completa.
 * Revisitar quando a Fase 2's /login virar parte do funil de compra.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id: cartId } = req.params
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const cartModuleService = req.scope.resolve(Modules.CART)

  let customer
  try {
    customer = await customerModuleService.retrieveCustomer(GUEST_CUSTOMER_ID)
  } catch {
    customer = await customerModuleService.createCustomers({
      id: GUEST_CUSTOMER_ID,
      email: "convidado@dev.local",
      metadata: { store_coins_balance: GUEST_STARTING_COINS },
    })
  }

  const cart = await cartModuleService.retrieveCart(cartId)
  if (cart.customer_id !== GUEST_CUSTOMER_ID) {
    await cartModuleService.updateCarts(cartId, { customer_id: GUEST_CUSTOMER_ID })
  }

  res.status(200).json({
    customer_id: GUEST_CUSTOMER_ID,
    coins_balance: customer.metadata?.store_coins_balance ?? 0,
  })
}
