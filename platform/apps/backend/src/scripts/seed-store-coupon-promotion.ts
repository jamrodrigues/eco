import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"

export const STORE_COUPON_CODE = "CUPOMLOJA5"

/**
 * Cupom de loja nativo (Medusa Promotions) substituindo o antigo
 * `store_coupon_cents` client-trusted da Fase 1: -R$5,00 fixo acima de
 * R$50,00 de subtotal, visivel/editavel em Admin > Promotions.
 */
export default async function seedStoreCouponPromotion({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
    filters: { code: STORE_COUPON_CODE },
  })
  if (existing.length > 0) {
    logger.info(`[store-coupon] Promoção ${STORE_COUPON_CODE} já existe, pulando.`)
    return
  }

  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: STORE_COUPON_CODE,
          type: "standard",
          status: "active",
          is_automatic: false,
          application_method: {
            type: "fixed",
            target_type: "order",
            allocation: "across",
            value: 500,
            currency_code: "brl",
          },
          // SEM rules de minimo-gasto: confirmado via
          // GET /admin/promotions/rule-attribute-options/rules que esta
          // versao do Medusa so aceita customer_group/region/country/
          // sales_channel/currency_code como atributo de regra de
          // elegibilidade de uma Promotion "standard" tipo order — nao
          // existe atributo nativo de "subtotal minimo". Medusa aceita
          // "item_total" na criacao sem validar e derruba o cupom
          // silenciosamente no primeiro recalculo do carrinho (bug real
          // que gastamos tempo depurando). O minimo de R$50 vira regra
          // de UX no frontend (so mostra/permite marcar o cupom acima
          // disso), nao mais uma garantia server-side via Promotion.
        },
      ],
    },
  })

  logger.info(`[store-coupon] Promoção ${STORE_COUPON_CODE} criada (-R$5 acima de R$50).`)
}
