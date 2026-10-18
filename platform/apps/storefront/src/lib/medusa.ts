const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

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

async function medusaFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    shipping_options: { code: string; name: string; amount: number }[]
  }>(`/store/shipping/cep?cep=${cep}`)
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
