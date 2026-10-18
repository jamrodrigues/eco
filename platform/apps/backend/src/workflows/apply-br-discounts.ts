import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createCartCreditLinesWorkflow,
  deleteCartCreditLinesWorkflow,
} from "@medusajs/medusa/core-flows"
import { debitCoins, creditCoins, coinsToCents } from "../modules/store-coins/service"

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

type BrDiscountsState = {
  coins_redeemed: number
  credit_line_ids: string[]
}

/**
 * Motor de empilhamento de descontos BR (@BackendMedusa, Fase 1-3):
 * cupom de loja + cupom de frete grátis + moedas + desconto Pix (10%),
 * todos aplicados simultaneamente sobre o mesmo carrinho.
 *
 * O total "de exibição" (br_pricing) agora também é expresso como um
 * Cart Credit Line real (reference "br_discounts"), que é o mecanismo
 * nativo do Medusa v2 para abater um valor do cart.total sem mexer na
 * engine de precificação de item. Isso faz cart.total (e por tabela
 * payment_collection.amount / order.total no /complete) baterem
 * exatamente com o número exibido no carrinho e no checkout — sem essa
 * credit line, cart.total continuava refletindo só preço + frete,
 * ignorando os descontos BR (gap identificado na Fase 3).
 *
 * Idempotente quanto a moedas: só debita/credita a *diferença* em
 * relação ao último valor de coins_to_redeem salvo no carrinho, já que
 * o endpoint é chamado de novo a cada toggle no checkout (frete grátis,
 * cupom, Pix).
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

  const storeCouponDiscount = Math.min(input.store_coupon_cents || 0, itemTotal)
  const freeShippingDiscount = input.free_shipping ? shippingTotal : 0

  const prevState = (cart.metadata?.br_discounts_state || null) as BrDiscountsState | null
  const requestedCoins = input.coins_to_redeem || 0
  const previouslyRedeemed = prevState?.coins_redeemed || 0

  if (cart.customer_id && requestedCoins !== previouslyRedeemed) {
    const delta = requestedCoins - previouslyRedeemed
    if (delta > 0) {
      await debitCoins(customerModuleService, cart.customer_id, delta)
    } else if (delta < 0) {
      await creditCoins(customerModuleService, cart.customer_id, -delta)
    }
  }
  const coinsDiscount = cart.customer_id ? coinsToCents(requestedCoins) : 0

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

  // Substitui a credit line anterior pela nova (recalculada a cada chamada).
  if (prevState?.credit_line_ids?.length) {
    await deleteCartCreditLinesWorkflow(container).run({
      input: { id: prevState.credit_line_ids },
    })
  }

  const totalDiscount =
    storeCouponDiscount + freeShippingDiscount + coinsDiscount + pixDiscount

  let newCreditLineIds: string[] = []
  if (totalDiscount > 0) {
    // createEntitiesStep internamente faz `data.length ? ... : []` — o
    // input PRECISA ser um array, apesar do docstring oficial do
    // workflow mostrar um objeto único (testado via medusa exec:
    // objeto único silenciosamente cria zero credit lines, sem erro).
    const { result: creditLines } = await createCartCreditLinesWorkflow(container).run({
      input: [
        {
          cart_id: input.cart_id,
          amount: totalDiscount,
          reference: "br_discounts",
          reference_id: input.cart_id,
          metadata: { breakdown },
        },
      ] as any,
    })
    newCreditLineIds = (creditLines || []).map((cl: any) => cl.id)
  }

  const nextState: BrDiscountsState = {
    coins_redeemed: requestedCoins,
    credit_line_ids: newCreditLineIds,
  }

  await cartModuleService.updateCarts(input.cart_id, {
    metadata: { ...cart.metadata, br_pricing: breakdown, br_discounts_state: nextState },
  })

  return breakdown
}
