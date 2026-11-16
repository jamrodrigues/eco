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
  metadata?: { sold_count?: number; review_count?: number; review_avg?: number } | null
  variants: {
    id: string
    title: string
    sku: string | null
    inventory_quantity?: number
    calculated_price?: {
      calculated_amount: number
      currency_code: string
      original_amount?: number
    }
  }[]
}

export type ProductOption = {
  id: string
  title: string
  values: { value: string }[]
}

export type VariantFitmentMetadata = {
  oem_part_number?: string
  ean_barcode?: string
  compatible_motorcycles?: {
    make: string
    model: string
    year_start: number
    year_end: number
  }[]
  viscosity_or_spec?: string
}

export type ProductVariantDetail = {
  id: string
  title: string
  sku: string | null
  inventory_quantity: number
  options: { value: string }[]
  calculated_price?: { calculated_amount: number; currency_code: string; original_amount: number }
  metadata?: VariantFitmentMetadata | null
}

export type ProductDetail = {
  id: string
  title: string
  handle: string
  description: string | null
  thumbnail: string | null
  images: { url: string }[]
  options: ProductOption[]
  metadata?: { sold_count?: number; review_count?: number; review_avg?: number } | null
  variants: ProductVariantDetail[]
  categories?: { id: string; name: string; handle: string }[]
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  material?: string | null
  origin_country?: string | null
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

export async function listProducts(opts: {
  limit?: number
  offset?: number
  q?: string
  categoryId?: string
  ids?: string[]
} = {}) {
  const limit = opts.limit ?? 24
  const offset = opts.offset ?? 0
  const regionId = process.env.NEXT_PUBLIC_REGION_ID
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    region_id: regionId || "",
    fields:
      "id,title,handle,thumbnail,metadata,*variants,variants.calculated_price,variants.inventory_quantity",
  })
  if (opts.q) params.append("q", opts.q)
  if (opts.categoryId) params.append("category_id[]", opts.categoryId)
  opts.ids?.forEach((id) => params.append("id[]", id))

  return medusaFetch<{ products: MedusaProduct[]; count: number }>(
    `/store/products?${params.toString()}`
  )
}

export async function getCategoryByHandle(handle: string) {
  const params = new URLSearchParams({ handle, fields: "id,name,handle" })
  const data = await medusaFetch<{
    product_categories: { id: string; name: string; handle: string }[]
  }>(`/store/product-categories?${params.toString()}`)
  return data.product_categories[0] ?? null
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

export type FlashSale =
  | { active: false }
  | { active: true; title: string; ends_at: string; product_ids: string[] }

/**
 * Oferta relampago ativa (price list nativa tipo Sale dentro do periodo).
 * Qualquer falha (404 se a rota ainda nao existe no backend, 500, rede) vira
 * "sem oferta" para nao quebrar a home.
 */
export async function getFlashSale(): Promise<FlashSale> {
  return medusaFetch<FlashSale>("/store/flash-sale").catch(
    (): FlashSale => ({ active: false })
  )
}

const PRODUCT_DETAIL_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "metadata",
  "weight",
  "length",
  "width",
  "height",
  "material",
  "origin_country",
  // `*categories` e nao `categories.name`: a forma com subcampo nao retorna
  // categorias nesta versao do Medusa (verificado com curl no produto real).
  "*categories",
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
  "variants.metadata",
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
  const product = products[0] ?? null
  if (!product) return null

  // A rota nativa /store/products nao expoe variants.metadata (allowlist
  // do Medusa so libera o metadata do produto, nao da variante) — busca
  // via rota custom e mescla. Ver apps/backend .../products/[id]/fitment.
  try {
    const { fitment } = await medusaFetch<{
      fitment: Record<string, VariantFitmentMetadata>
    }>(`/store/products/${product.id}/fitment`)
    product.variants = product.variants.map((v) => ({
      ...v,
      metadata: fitment[v.id] ?? v.metadata,
    }))
  } catch {
    // rota opcional — se falhar, segue sem dados de fitment (produtos
    // fora da Vruumoto nao tem essa rota relevante de qualquer forma)
  }

  return product
}

export type StoreReview = {
  id: string
  author_name: string
  rating: number
  title: string | null
  body: string
  verified_purchase: boolean
  created_at: string
}

export type ReviewSummary = {
  review_count: number
  review_avg: number
  by_rating: Record<string, number>
}

/** Lista só avaliações aprovadas. `rating` filtra por nota exata (1-5). */
export async function getProductReviews(
  productId: string,
  opts: { rating?: number; limit?: number; offset?: number } = {}
): Promise<{ reviews: StoreReview[]; count: number; summary: ReviewSummary }> {
  const params = new URLSearchParams()
  if (opts.rating !== undefined) params.set("rating", String(opts.rating))
  if (opts.limit !== undefined) params.set("limit", String(opts.limit))
  if (opts.offset !== undefined) params.set("offset", String(opts.offset))
  const qs = params.toString()
  return medusaFetch(`/store/products/${productId}/reviews${qs ? `?${qs}` : ""}`)
}

/**
 * Envia avaliação de cliente logado (fica pendente até moderação). Não engole
 * erro: em HTTP de erro lança Error com a `message` do backend e a propriedade
 * `status` preenchida, para o componente decidir a mensagem (ex: 409 = já avaliou).
 */
export async function postProductReview(
  productId: string,
  token: string,
  body: { rating: number; title?: string; body: string }
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/store/products/${productId}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw Object.assign(new Error(data.message || `Erro ${res.status}`), {
      status: res.status,
    })
  }
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}
