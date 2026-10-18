import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { debitCoins, coinsToCents } from "../modules/store-coins/service"

export type ApplyBrDiscountsInput = {
  cart_id: string
  store_coupon_cents?: number
  free_shipping?: boolean
  coins_to_redeem?: number
  pix_discount_percent?: number
  is_pix_selected?: boolean
}

export type BrPricingBreakdown = {
  item_total: number
  shipping_total: number
  store_coupon_discount: number
  free_shipping_discount: number
  coins_discount: number
  pix_discount: number
  total: number
}

/**
 * Motor de empilhamento de descontos BR (@BackendMedusa, Fase 1):
 * cupom de loja + cupom de frete grátis + moedas + desconto Pix (10%),
 * todos aplicados simultaneamente sobre o mesmo carrinho.
 *
 * O total nativo do Medusa (cart.total) continua refletindo apenas
 * preço + frete; o resultado desta função é a referência de cobrança
 * BR e fica salvo em cart.metadata.br_pricing.
 */
export async function applyBrDiscounts(
  container: MedusaContainer,
  input: ApplyBrDiscountsInput
): Promise<BrPricingBreakdown> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const cartModuleService = container.resolve(Modules.CART)
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  const cart = await cartModuleService.retrieveCart(input.cart_id, {
    relations: ["items", "shipping_methods"],
  })

  const itemTotal = (cart.items || []).reduce(
    (sum: number, item: any) => sum + item.unit_price * item.quantity,
    0
  )
  const shippingTotal = (cart.shipping_methods || []).reduce(
    (sum: number, method: any) => sum + method.amount,
    0
  )

  const storeCouponDiscount = Math.min(
    input.store_coupon_cents || 0,
    itemTotal
  )

  const freeShippingDiscount = input.free_shipping ? shippingTotal : 0

  let coinsDiscount = 0
  if (input.coins_to_redeem && cart.customer_id) {
    coinsDiscount = coinsToCents(input.coins_to_redeem)
    await debitCoins(customerModuleService, cart.customer_id, input.coins_to_redeem)
  }

  const pixDiscount = input.is_pix_selected
    ? Math.round((itemTotal * (input.pix_discount_percent ?? 10)) / 100)
    : 0

  const total =
    itemTotal +
    shippingTotal -
    storeCouponDiscount -
    freeShippingDiscount -
    coinsDiscount -
    pixDiscount

  const breakdown: BrPricingBreakdown = {
    item_total: itemTotal,
    shipping_total: shippingTotal,
    store_coupon_discount: storeCouponDiscount,
    free_shipping_discount: freeShippingDiscount,
    coins_discount: coinsDiscount,
    pix_discount: pixDiscount,
    total,
  }

  await cartModuleService.updateCarts(input.cart_id, {
    metadata: { ...cart.metadata, br_pricing: breakdown },
  })

  return breakdown
}
