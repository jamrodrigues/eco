import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /store/carts/:id/link-customer
 *
 * Vincula o carrinho ao cliente REALMENTE autenticado (sessão
 * registrada, ver fluxo de cadastro/login no storefront) — distinto
 * do `guest-customer` (que vincula a um customer de dev fixo, usado
 * só para preview de saldo de moedas antes do login). Exige
 * Authorization: Bearer <token> de uma sessão customer válida,
 * aplicado via middleware `authenticate("customer", ["bearer"])` em
 * src/api/middlewares.ts.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id: cartId } = req.params
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
    ?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Sessão de cliente inválida." })
  }

  const cartModuleService = req.scope.resolve(Modules.CART)
  const cart = await cartModuleService.retrieveCart(cartId)
  if (cart.customer_id !== customerId) {
    await cartModuleService.updateCarts(cartId, { customer_id: customerId })
  }

  res.status(200).json({ customer_id: customerId })
}
