import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { pixStatusEmitter } from "../../../../pix-status/[order_id]/emitter"

/**
 * POST /store/pix/simulate-pay/:cart_id
 *
 * Simulação local de pagamento Pix para desenvolvimento sem chaves do
 * Pagar.me: marca o carrinho como pago e dispara o mesmo evento que o
 * webhook real emitiria (@BackendMedusa, Fase 1).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id } = req.params
  const cartModuleService = req.scope.resolve(Modules.CART)

  const cart = await cartModuleService.retrieveCart(cart_id)
  await cartModuleService.updateCarts(cart_id, {
    metadata: { ...cart.metadata, pix_status: "paid" },
  })

  pixStatusEmitter.emit(cart_id, { status: "paid", cart_id })

  res.status(200).json({ cart_id, status: "paid", simulated: true })
}
