import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FRANCHISE_HYPERLOCAL_MODULE } from "../modules/franchise-hyperlocal"

/**
 * Seed das franchise_unit de exemplo (Fase 4 / @POSHyperlocal), uma para
 * cada Stock Location já criado pelo seed-br.ts. Idempotente por nome.
 *
 * Run with: npx medusa exec ./src/scripts/seed-franchise-units.ts
 */
export default async function seedFranchiseUnits({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const franchiseHyperlocalService = container.resolve(FRANCHISE_HYPERLOCAL_MODULE)

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "address.city"],
  })

  const matriz = stockLocations.find((l: any) =>
    l.name.startsWith("Loja Física Matriz")
  )
  const franqueado = stockLocations.find((l: any) =>
    l.name.startsWith("CD Franqueado Exemplo")
  )

  if (!matriz || !franqueado) {
    logger.error(
      "[franchise-hyperlocal] Stock locations do seed-br.ts não encontrados — rode `npm run seed` antes."
    )
    return
  }

  const existing = await franchiseHyperlocalService.listFranchiseUnits()
  if (existing.length > 0) {
    logger.info(
      `[franchise-hyperlocal] ${existing.length} franchise_unit já existem, pulando.`
    )
    return
  }

  await franchiseHyperlocalService.createFranchiseUnits([
    {
      name: "Unidade Matriz (São Paulo Capital)",
      city: matriz.address?.city || "São Paulo",
      state: "SP",
      cep_prefix_start: "01000000",
      cep_prefix_end: "01999999",
      stock_location_id: matriz.id,
      recipient_pagarme_id: null,
      commission_rate: 0,
    },
    {
      name: "Unidade Campinas (Franqueado Exemplo)",
      city: franqueado.address?.city || "Campinas",
      state: "SP",
      cep_prefix_start: "13000000",
      cep_prefix_end: "13999999",
      stock_location_id: franqueado.id,
      recipient_pagarme_id: "acc_test_campinas_franqueado",
      commission_rate: 15,
    },
  ])

  logger.info("[franchise-hyperlocal] 2 franchise_unit criadas (Matriz SP + Campinas).")
}
