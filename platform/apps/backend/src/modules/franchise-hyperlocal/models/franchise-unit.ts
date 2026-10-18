import { model } from "@medusajs/framework/utils"

/**
 * Unidade de franqueado/lojista local, vinculada a um Stock Location do
 * Medusa (loja matriz ou futuro franqueado por cidade). O roteamento por
 * CEP usa cep_prefix_start/end para decidir qual unidade atende aquele
 * comprador (@POSHyperlocal, Fase 4).
 */
const FranchiseUnit = model.define("franchise_unit", {
  id: model.id().primaryKey(),
  name: model.text(),
  city: model.text(),
  state: model.text(),
  cep_prefix_start: model.text(),
  cep_prefix_end: model.text(),
  stock_location_id: model.text(),
  recipient_pagarme_id: model.text().nullable(),
  commission_rate: model.number().default(0),
})

export default FranchiseUnit
