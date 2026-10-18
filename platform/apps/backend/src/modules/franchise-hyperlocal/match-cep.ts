export type FranchiseUnitMatch = {
  id: string
  name: string
  city: string
  state: string
  stock_location_id: string
}

/**
 * Normaliza um CEP (com ou sem máscara) para os 8 dígitos e verifica se
 * alguma franchise_unit cobre a faixa cep_prefix_start..cep_prefix_end.
 * Comparação lexicográfica de strings de 8 dígitos (zero-padded) é
 * equivalente à comparação numérica e evita overflow/parse de CEPs com
 * zero à esquerda.
 */
export async function matchFranchiseUnit(
  franchiseHyperlocalService: any,
  cep: string
): Promise<FranchiseUnitMatch | null> {
  const digits = cep.replace(/\D/g, "")
  if (digits.length !== 8) return null

  const units = await franchiseHyperlocalService.listFranchiseUnits()

  const match = units.find((unit: any) => {
    const start = unit.cep_prefix_start.replace(/\D/g, "").padEnd(8, "0")
    const end = unit.cep_prefix_end.replace(/\D/g, "").padEnd(8, "9")
    return digits >= start && digits <= end
  })

  if (!match) return null

  return {
    id: match.id,
    name: match.name,
    city: match.city,
    state: match.state,
    stock_location_id: match.stock_location_id,
  }
}
