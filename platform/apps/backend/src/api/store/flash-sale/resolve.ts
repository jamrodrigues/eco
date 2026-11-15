export type FlashSaleResult =
  | { active: false }
  | { active: true; title: string; ends_at: string; product_ids: string[] }

type PriceListLike = {
  id: string
  title?: string | null
  starts_at?: Date | string | null
  ends_at?: Date | string | null
  prices?: { price_set_id: string }[] | null
}

type VariantLike = {
  id: string
  product_id: string
  price_set?: { id: string } | null
}

export interface FlashSaleDeps {
  pricing: {
    listPriceLists(filters: any, config: any): Promise<any[]>
  }
  query: {
    graph: Function
  }
}

/**
 * Resolve a oferta relâmpago ativa a partir de price lists nativas do tipo Sale.
 *
 * Regras: só entra price list `active` com `ends_at` preenchido, ainda no futuro
 * e já iniciada (`starts_at` nulo ou <= now). Entre as válidas, vence a que
 * termina primeiro. Os produtos vêm dos price sets dos prices dela, mapeados
 * para as variantes (`variant.price_set.id`) e depois para `product_id`.
 */
export async function resolveFlashSale(
  deps: FlashSaleDeps,
  now: Date
): Promise<FlashSaleResult> {
  const priceLists = (await deps.pricing.listPriceLists(
    { status: "active", type: "sale" },
    { relations: ["prices"] }
  )) as PriceListLike[]

  const candidates = priceLists
    .map((pl) => ({
      pl,
      start: pl.starts_at ? new Date(pl.starts_at) : null,
      end: pl.ends_at ? new Date(pl.ends_at) : null,
    }))
    .filter(
      (c): c is typeof c & { end: Date } =>
        c.end !== null &&
        c.end.getTime() > now.getTime() &&
        !(c.start && c.start.getTime() > now.getTime())
    )
    .sort((a, b) => a.end.getTime() - b.end.getTime())

  if (candidates.length === 0) {
    return { active: false }
  }

  const chosen = candidates[0]
  const priceSetIds = new Set(
    (chosen.pl.prices ?? []).map((p) => p.price_set_id).filter(Boolean)
  )
  if (priceSetIds.size === 0) {
    return { active: false }
  }

  const { data: variants } = await deps.query.graph({
    entity: "variant",
    fields: ["id", "product_id", "price_set.id"],
  })

  const productIds = new Set<string>()
  for (const v of (variants ?? []) as VariantLike[]) {
    const psId = v.price_set?.id
    if (psId && priceSetIds.has(psId) && v.product_id) {
      productIds.add(v.product_id)
    }
  }

  if (productIds.size === 0) {
    return { active: false }
  }

  return {
    active: true,
    title: chosen.pl.title ?? "Ofertas Relâmpago",
    ends_at: chosen.end.toISOString(),
    product_ids: [...productIds],
  }
}
