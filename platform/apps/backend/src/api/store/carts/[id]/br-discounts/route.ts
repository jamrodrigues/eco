import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyBrDiscounts } from "../../../../../workflows/apply-br-discounts"

type Body = {
  store_coupon_cents?: number
  free_shipping?: boolean
  coins_to_redeem?: number
  pix_discount_percent?: number
  is_pix_selected?: boolean
}

/**
 * POST /store/carts/:id/br-discounts
 *
 * Aplica o empilhamento de descontos BR (cupom loja + frete grátis +
 * moedas + Pix 10%) sobre o carrinho e retorna o detalhamento.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const { id } = req.params
  try {
    const breakdown = await applyBrDiscounts(req.scope, {
      cart_id: id,
      ...req.body,
    })
    res.status(200).json({ cart_id: id, br_pricing: breakdown })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
