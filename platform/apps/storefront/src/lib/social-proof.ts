/** Abaixo disso não mostramos "X vendidos" — número pequeno vira constrangedor. */
export const MIN_SOLD_TO_SHOW = 5

/**
 * Retorna o texto de "vendidos" a partir de `metadata.sold_count`, ou `null`
 * quando não há dado real ou ele está abaixo do mínimo. Nunca inventa número.
 */
export function formatSoldLabel(soldCount: number | undefined): string | null {
  if (soldCount === undefined || soldCount === null || soldCount < MIN_SOLD_TO_SHOW) {
    return null
  }
  if (soldCount < 1000) {
    return `${soldCount} vendidos`
  }
  const thousands = (soldCount / 1000).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })
  return `${thousands} mil vendidos`
}

/**
 * Retorna "4,8 ★ (12 avaliações)" a partir da média e da contagem reais, ou
 * `null` quando não há nenhuma avaliação.
 */
export function formatRatingLabel(
  avg: number | undefined,
  count: number | undefined
): string | null {
  if (!count) return null
  const countText = count === 1 ? "1 avaliação" : `${count} avaliações`
  if (avg === undefined || avg === null) return `(${countText})`
  const avgText = avg.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${avgText} ★ (${countText})`
}

/** Percentual de desconto real entre preço calculado e preço original; 0 se não há desconto. */
export function discountPercent(calculated: number, original: number | undefined): number {
  if (original === undefined || original === null || original <= calculated) return 0
  return Math.round(((original - calculated) / original) * 100)
}
