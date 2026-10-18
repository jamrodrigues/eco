export const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
export const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""
export const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID || ""
export const SALES_CHANNEL_ID = process.env.NEXT_PUBLIC_SALES_CHANNEL_ID || ""

export type MedusaProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  variants: {
    id: string
    title: string
    sku: string | null
    calculated_price?: { calculated_amount: number; currency_code: string }
  }[]
}

export type ProductOption = {
  id: string
  title: string
  values: { value: string }[]
}

export type ProductVariantDetail = {
  id: string
  title: string
  sku: string | null
  inventory_quantity: number
  options: { value: string }[]
  calculated_price?: { calculated_amount: number; currency_code: string; original_amount: number }
}

export type ProductDetail = {
  id: string
  title: string
  handle: string
  description: string | null
  thumbnail: string | null
  images: { url: string }[]
  options: ProductOption[]
  variants: ProductVariantDetail[]
}

export async function medusaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Medusa ${path} -> ${response.status}: ${body}`)
  }

  return response.json()
}

export async function listProducts(opts: { limit?: number; offset?: number } = {}) {
  const limit = opts.limit ?? 24
  const offset = opts.offset ?? 0
  const regionId = process.env.NEXT_PUBLIC_REGION_ID
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    region_id: regionId || "",
    fields:
      "id,title,handle,thumbnail,*variants,variants.calculated_price",
  })

  return medusaFetch<{ products: MedusaProduct[]; count: number }>(
    `/store/products?${params.toString()}`
  )
}

export async function getShippingByCep(cep: string) {
  return medusaFetch<{
    cep: string
    address: Record<string, string | null>
    hyperlocal_match: boolean
    shipping_options: {
      code: string
      name: string
      amount: number
      estimated_days?: string
    }[]
  }>(`/store/shipping/cep?cep=${cep}`)
}

export async function getInstitutionalPage(slug: string) {
  return medusaFetch<{ title: string; body: string[] }>(
    `/store/institutional-pages/${slug}`
  )
}

const PRODUCT_DETAIL_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "images.url",
  "options.id",
  "options.title",
  "options.values.value",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.inventory_quantity",
  "variants.calculated_price",
  "variants.options.value",
].join(",")

/** Mapeia variant.options (array posicional) para {OptionTitle: value}. */
export function variantOptionMap(
  product: ProductDetail,
  variant: ProductVariantDetail
): Record<string, string> {
  const map: Record<string, string> = {}
  product.options.forEach((opt, i) => {
    const value = variant.options?.[i]?.value
    if (value) map[opt.title] = value
  })
  return map
}

/** Encontra a variante cuja combinação de opções bate exatamente com `selection`. */
export function findVariantBySelection(
  product: ProductDetail,
  selection: Record<string, string>
): ProductVariantDetail | undefined {
  return product.variants.find((variant) => {
    const map = variantOptionMap(product, variant)
    return product.options.every((opt) => map[opt.title] === selection[opt.title])
  })
}

/**
 * Para o botão `optionTitle = value`, existe alguma variante com estoque
 * disponível considerando as outras dimensões já selecionadas? Usado para
 * desabilitar tamanhos/cores esgotados na matriz de SKU.
 */
export function isOptionValueAvailable(
  product: ProductDetail,
  selection: Record<string, string>,
  optionTitle: string,
  value: string
): boolean {
  const hypothetical = { ...selection, [optionTitle]: value }
  return product.variants.some((variant) => {
    const map = variantOptionMap(product, variant)
    if (map[optionTitle] !== value) return false
    const matchesOtherSelections = Object.entries(hypothetical).every(
      ([title, val]) => !selection[title] || title === optionTitle || map[title] === val
    )
    return matchesOtherSelections && variant.inventory_quantity > 0
  })
}

export async function getProductByHandle(handle: string) {
  const params = new URLSearchParams({
    handle,
    region_id: REGION_ID,
    fields: PRODUCT_DETAIL_FIELDS,
  })
  const { products } = await medusaFetch<{ products: ProductDetail[] }>(
    `/store/products?${params.toString()}`
  )
  return products[0] ?? null
}

/** Hash determinístico simples — evita Math.random() no render (mismatch de hidratação). */
export function deterministicInRange(seed: string, min: number, max: number) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return min + (hash % (max - min + 1))
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}
