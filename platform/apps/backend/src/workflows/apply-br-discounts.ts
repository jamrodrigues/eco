import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createCartCreditLinesWorkflow,
  deleteCartCreditLinesWorkflow,
} from "@medusajs/medusa/core-flows"
import { STORE_COINS_MODULE } from "../modules/store-coins"
import { redeemCoins, undoRedeem, coinsToCents, getSettings } from "../modules/store-coins/ledger"

export type ApplyBrDiscountsInput = {
  cart_id: string
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
 * Motor de empilhamento de descontos BR (@BackendMedusa, Fase 1-3,
 * migrado na Fase "moedas via admin"): cupom de loja + cupom de frete
 * grátis + moedas + desconto Pix (10%), todos aplicados simultaneamente
 * sobre o mesmo carrinho.
 *
 * O cupom de loja NÃO é mais calculado aqui — virou uma Promotion
 * nativa do Medusa (ver seed-store-coupon-promotion.ts), aplicada via
 * POST /store/carts/:id/promotions. O Medusa já desconta isso sozinho
 * em cart.item_total (confirmado: item.unit_price fica cru, mas
 * cart.item_total — populado mesmo via cartModuleService.retrieveCart —
 * já vem líquido do ajuste da promoção). Aqui só *lemos* esse total já
 * líquido e expomos store_coupon_discount (= item_subtotal - item_total)
 * de volta pro frontend, só para exibição da linha no resumo.
 *
 * O que continua sendo cálculo manual (porque não dá pra modelar como
 * Promotion nativa, ou não valeria a pena pelo tipo de UX): frete
 * grátis (é um toggle direto do cliente, não um código de cupom —
 * daria pra virar Promotion com target_type "shipping_methods", mas
 * decidimos deixar como está por agora, revisitar se fizer sentido),
 * moedas (depende da carteira do cliente) e desconto Pix (depende do
 * método de pagamento escolhido). Esses continuam expressos como um
 * Cart Credit Line real (reference "br_discounts") por cima do total
 * nativo já líquido do cupom — mecanismo que já resolvia o gap de
 * cart.total não bater com o resumo (Fase 3).
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
  const storeCoinsService: any = container.resolve(STORE_COINS_MODULE)
  const settings = await getSettings(storeCoinsService)

  const cart = await cartModuleService.retrieveCart(input.cart_id, {
    relations: ["items", "shipping_methods"],
  })

  // cart.item_total/item_subtotal já vêm líquidos/brutos de qualquer
  // Promotion nativa aplicada (ex: CUPOMLOJA5) — testado via medusa
  // exec que o module service popula esses campos corretamente, não só
  // a Store API. item.unit_price continua cru (não usar para total).
  const itemTotal = Number(cart.item_total)
  const itemSubtotal = Number(cart.item_subtotal)
  const shippingTotal = Number(cart.shipping_total)

  const storeCouponDiscount = Math.max(0, itemSubtotal - itemTotal)
  const freeShippingDiscount = input.free_shipping ? shippingTotal : 0

  const prevState = (cart.metadata?.br_discounts_state || null) as BrDiscountsState | null
  const requestedCoins = Math.min(input.coins_to_redeem || 0, settings.max_redeem_per_order)
  const previouslyRedeemed = prevState?.coins_redeemed || 0

  // Nunca confia no saldo que o cliente alega ter: redeemCoins le o saldo
  // real do razao e limita pelo teto configurado no Admin, server-side.
  let actualRedeemed = previouslyRedeemed
  if (cart.customer_id && requestedCoins !== previouslyRedeemed) {
    const delta = requestedCoins - previouslyRedeemed
    if (delta > 0) {
      const { redeemed } = await redeemCoins(storeCoinsService, {
        customerId: cart.customer_id,
        coins: delta,
        referenceId: cart.id,
      })
      actualRedeemed = previouslyRedeemed + redeemed
    } else if (delta < 0) {
      await undoRedeem(storeCoinsService, {
        customerId: cart.customer_id,
        coins: -delta,
        referenceId: cart.id,
      })
      actualRedeemed = requestedCoins
    }
  }
  const coinsDiscount = cart.customer_id ? coinsToCents(actualRedeemed, settings) : 0

  // Pix incide sobre o preço cheio do produto (item_subtotal), não sobre
  // o já descontado pelo cupom — mantém o criterio de aceite original da
  // Fase 1 (10% de R$53,94 = R$5,39, não 10% de R$48,94).
  const pixDiscount = input.is_pix_selected
    ? Math.round((itemSubtotal * (input.pix_discount_percent ?? 10)) / 100)
    : 0

  // itemTotal já está líquido do cupom nativo — não subtrai de novo aqui,
  // senão desconta em dobro.
  const total =
    itemTotal +
    shippingTotal -
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

  // storeCouponDiscount NÃO entra aqui: já está embutido em cart.item_total
  // via Promotion nativa, a credit line cobre só o que o Medusa não sabe.
  const totalDiscount = freeShippingDiscount + coinsDiscount + pixDiscount

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
    coins_redeemed: actualRedeemed,
    credit_line_ids: newCreditLineIds,
  }

  await cartModuleService.updateCarts(input.cart_id, {
    metadata: { ...cart.metadata, br_pricing: breakdown, br_discounts_state: nextState },
  })

  return breakdown
}
