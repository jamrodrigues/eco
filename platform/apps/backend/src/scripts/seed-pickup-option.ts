import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Adiciona "Retirar na Loja (Grátis)" como modalidade de frete do
 * checkout BR, vinculada a service zone/fulfillment set ja existentes
 * da Fase 1. Nao existe um tipo nativo "pickup" nessa versao do
 * Medusa (so "shipping"/"return"), entao tratamos como mais uma
 * shipping_option com codigo proprio "pickup_store", mesmo padrao ja
 * usado para "standard_br"/"express_hyperlocal_br".
 */

const REGION_ID = "reg_01M57DKSVKE5NSXA1BVS5KD8K2"
const SERVICE_ZONE_ID = "serzo_01M57DKTB54CP9EQZPJ55GNMH8"
const SHIPPING_PROFILE_ID = "sp_01M57DKKJH02MNJ1KKFAR8NWWV"

export default async function seedPickupOption({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existing } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
    filters: { name: "Retirar na Loja (Grátis)" },
  })
  if (existing.length) {
    logger.info("[pickup] Já existe, pulando.")
    return
  }

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Retirar na Loja (Grátis)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: SERVICE_ZONE_ID,
        shipping_profile_id: SHIPPING_PROFILE_ID,
        type: {
          label: "Retirada",
          description: "Retire gratuitamente na Loja Física Matriz.",
          code: "pickup_store",
        },
        prices: [{ region_id: REGION_ID, amount: 0 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  logger.info("[pickup] Opção 'Retirar na Loja (Grátis)' criada.")
}
