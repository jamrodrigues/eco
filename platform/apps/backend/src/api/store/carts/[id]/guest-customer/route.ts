import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { createCustomersWorkflow } from "@medusajs/medusa/core-flows"
import { STORE_COINS_MODULE } from "../../../../../modules/store-coins"
import { getBalance } from "../../../../../modules/store-coins/ledger"

const GUEST_CUSTOMER_ID = "cus_guest_dev"

/**
 * POST /store/carts/:id/guest-customer
 *
 * Fase 3 ainda nao tem fluxo de registro/login real no funil de
 * checkout — isso cria (uma vez) um customer convidado de dev e
 * vincula ao carrinho, so para o resgate/ganho de moedas funcionar
 * fim-a-fim sem exigir autenticacao completa. Revisitar quando a
 * Fase 2's /login virar parte do funil de compra.
 *
 * Usa createCustomersWorkflow (nao customerModuleService.createCustomers
 * direto) para que o evento customer.created dispare e o bonus de
 * cadastro seja creditado pelo subscriber correspondente.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id: cartId } = req.params
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const cartModuleService = req.scope.resolve(Modules.CART)
  const storeCoinsService: any = req.scope.resolve(STORE_COINS_MODULE)

  let customer
  try {
    customer = await customerModuleService.retrieveCustomer(GUEST_CUSTOMER_ID)
  } catch {
    const { result } = await createCustomersWorkflow(req.scope).run({
      input: {
        customersData: [{ id: GUEST_CUSTOMER_ID, email: "convidado@dev.local" } as any],
      },
    })
    customer = result[0]
  }

  const cart = await cartModuleService.retrieveCart(cartId)
  if (cart.customer_id !== GUEST_CUSTOMER_ID) {
    await cartModuleService.updateCarts(cartId, { customer_id: GUEST_CUSTOMER_ID })
  }

  const coinsBalance = await getBalance(storeCoinsService, GUEST_CUSTOMER_ID)

  res.status(200).json({
    customer_id: GUEST_CUSTOMER_ID,
    coins_balance: coinsBalance,
  })
}
