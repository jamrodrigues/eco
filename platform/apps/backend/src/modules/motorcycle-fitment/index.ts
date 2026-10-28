/**
 * motorcycle-fitment (Fase 5 / Vruumoto, doc seção 3B).
 *
 * Não é um módulo Medusa com entidade/migration própria — o doc pede
 * explicitamente que os dados fiquem nos metadados estruturados da
 * variante (`product_variant.metadata`), não numa tabela relacional
 * separada. Isso é só o contrato de tipos + helpers de leitura/match,
 * reaproveitado pelo PDV e pelo storefront.
 */
export type CompatibleMotorcycle = {
  make: string
  model: string
  year_start: number
  year_end: number
}

export type VariantFitmentMetadata = {
  oem_part_number?: string
  ean_barcode?: string
  compatible_motorcycles?: CompatibleMotorcycle[]
  viscosity_or_spec?: string
}

export function isMotorcycleCompatible(
  bike: { make: string; model: string; year: number },
  compatibleList: CompatibleMotorcycle[] | undefined
): boolean {
  if (!compatibleList?.length) return false
  return compatibleList.some(
    (c) =>
      c.make.toLowerCase() === bike.make.toLowerCase() &&
      c.model.toLowerCase().includes(bike.model.toLowerCase().split(" ")[0]) &&
      bike.year >= c.year_start &&
      bike.year <= c.year_end
  )
}
