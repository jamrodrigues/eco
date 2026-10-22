"use client"

import { BACKEND_URL, PUBLISHABLE_KEY, REGION_ID, SALES_CHANNEL_ID } from "./medusa"

const CART_ID_KEY = "ecommerce_cart_id"

export type CartItem = {
  id: string
  title: string
  thumbnail: string | null
  variant_id: string
  variant_title: string
  variant_sku: string | null
  product_handle: string
  quantity: number
  unit_price: number
}

export type CartShippingMethod = {
  id: string
  name: string
  amount: number
}

export type Cart = {
  id: string
  customer_id: string | null
  item_total: number
  item_subtotal: number
  shipping_total: number
  total: number
  items: CartItem[]
  shipping_methods: CartShippingMethod[]
  metadata: Record<string, unknown> | null
  completed_at: string | null
}

export type BrPricing = {
  item_total: number
  shipping_total: number
  store_coupon_discount: number
  free_shipping_discount: number
  coins_discount: number
  pix_discount: number
  total: number
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new Error(`Cart ${path} -> ${response.status}: ${body}`)
  }
  return response.json()
}

export function getStoredCartId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(CART_ID_KEY)
  } catch {
    return null
  }
}

function storeCartId(id: string) {
  try {
    window.localStorage.setItem(CART_ID_KEY, id)
  } catch {
    // localStorage indisponível (ex: aba privada) — carrinho só dura a sessão da página
  }
}

export function clearStoredCartId() {
  try {
    window.localStorage.removeItem(CART_ID_KEY)
  } catch {
    // ver storeCartId
  }
  notifyCartChanged()
}

/** Header escuta esse evento pra atualizar o contador do ícone do carrinho. */
export const CART_CHANGED_EVENT = "cart:changed"

function notifyCartChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CART_CHANGED_EVENT))
}

export async function getCartIfExists(): Promise<Cart | null> {
  const existingId = getStoredCartId()
  if (!existingId) return null
  try {
    const { cart } = await fetchJson<{ cart: Cart }>(`/store/carts/${existingId}`)
    // Um carrinho finalizado (ex: aba antiga reaberta após /complete) não é
    // reutilizável — a API rejeita qualquer mutação nele.
    if (cart.completed_at) {
      clearStoredCartId()
      return null
    }
    return cart
  } catch {
    return null
  }
}

export async function getOrCreateCart(): Promise<Cart> {
  const existingId = getStoredCartId()
  if (existingId) {
    try {
      const { cart } = await fetchJson<{ cart: Cart }>(`/store/carts/${existingId}`)
      if (cart.completed_at) {
        clearStoredCartId()
      } else {
        return cart
      }
    } catch {
      // carrinho antigo não existe mais (ex: reset de DB) — cria um novo
    }
  }

  const { cart } = await fetchJson<{ cart: Cart }>("/store/carts", {
    method: "POST",
    body: JSON.stringify({
      region_id: REGION_ID,
      sales_channel_id: SALES_CHANNEL_ID,
      currency_code: "brl",
    }),
  })
  storeCartId(cart.id)
  return cart
}

export async function addLineItem(cartId: string, variantId: string, quantity: number) {
  const { cart } = await fetchJson<{ cart: Cart }>(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  })
  notifyCartChanged()
  return cart
}

export async function updateLineItemQuantity(cartId: string, lineItemId: string, quantity: number) {
  const { cart } = await fetchJson<{ cart: Cart }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    { method: "POST", body: JSON.stringify({ quantity }) }
  )
  notifyCartChanged()
  return cart
}

export async function removeLineItem(cartId: string, lineItemId: string) {
  const { parent: cart } = await fetchJson<{ parent: Cart }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    { method: "DELETE" }
  )
  notifyCartChanged()
  return cart
}

export async function addShippingMethod(cartId: string, optionId: string) {
  const { cart } = await fetchJson<{ cart: Cart }>(`/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  })
  return cart
}

export async function updateCartDetails(
  cartId: string,
  data: {
    email?: string
    shipping_address?: Record<string, string>
  }
) {
  const { cart } = await fetchJson<{ cart: Cart }>(`/store/carts/${cartId}`, {
    method: "POST",
    body: JSON.stringify(data),
  })
  return cart
}

export async function createPaymentCollection(cartId: string) {
  const { payment_collection } = await fetchJson<{
    payment_collection: { id: string; amount: number }
  }>("/store/payment-collections", {
    method: "POST",
    body: JSON.stringify({ cart_id: cartId }),
  })
  return payment_collection
}

export type PixSessionData = {
  qr_code_emv: string
  qr_code_base64: string
  expires_at: string
}

export async function createPaymentSession(
  paymentCollectionId: string,
  providerId: string
) {
  const { payment_collection } = await fetchJson<{
    payment_collection: {
      payment_sessions: { id: string; provider_id: string; data: Record<string, unknown> }[]
    }
  }>(`/store/payment-collections/${paymentCollectionId}/payment-sessions`, {
    method: "POST",
    body: JSON.stringify({ provider_id: providerId }),
  })
  const session = payment_collection.payment_sessions.find(
    (s) => s.provider_id === providerId
  )
  return session
}

export const PAYMENT_PROVIDER_IDS = {
  pix: "pp_pagarme-br_pix_br",
  card: "pp_pagarme-br_card_br",
  boleto: "pp_pagarme-br_boleto_br",
} as const

/**
 * O saldo retornado por ensureGuestCustomer já reflete qualquer resgate
 * anterior feito *neste mesmo carrinho* (o backend debita a carteira a
 * cada chamada de applyBrDiscounts). Para decidir quanto ainda é
 * possível resgatar, soma de volta o que este carrinho já resgatou —
 * senão carrinho e checkout, cada um clampando contra o saldo já
 * reduzido pelo outro, resgatariam cada vez menos a cada ida-e-volta.
 */
type BrDiscountsStateMetadata = {
  br_discounts_state?: { coins_redeemed?: number; credit_line_ids?: string[] }
}

export function alreadyRedeemedCoins(cart: Cart | null): number {
  const metadata = cart?.metadata as BrDiscountsStateMetadata | null | undefined
  return Number(metadata?.br_discounts_state?.coins_redeemed || 0)
}

export function trueAvailableCoins(cart: Cart | null, liveBalance: number | null) {
  return (liveBalance ?? 0) + alreadyRedeemedCoins(cart)
}

export async function ensureGuestCustomer(cartId: string) {
  return fetchJson<{ customer_id: string; coins_balance: number }>(
    `/store/carts/${cartId}/guest-customer`,
    { method: "POST" }
  )
}

/**
 * Vincula o carrinho ao cliente REALMENTE autenticado (cadastro/login
 * real, ver src/lib/auth.ts) — usado no checkout, agora que ele exige
 * sessão. `ensureGuestCustomer` continua existindo só para a prévia de
 * saldo de moedas no /cart antes do visitante logar.
 */
export async function linkCustomerToCart(cartId: string, token: string) {
  return fetchJson<{ customer_id: string }>(`/store/carts/${cartId}/link-customer`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getCartCoins(cartId: string) {
  return fetchJson<{ coins_balance: number; ledger: unknown[] }>(
    `/store/carts/${cartId}/coins`
  )
}

export const STORE_COUPON_CODE = "CUPOMLOJA5"
// Limiar de UX só: a Promotion nativa (ver seed-store-coupon-promotion.ts
// no backend) não tem mais regra de mínimo-gasto server-side (Medusa não
// suporta esse atributo de regra nesta versão — ver comentário no seed).
// Isso só decide quando mostrar/permitir marcar o checkbox do cupom.
export const STORE_COUPON_MIN_SPEND = 5000

export async function addPromoCode(cartId: string, code: string) {
  const { cart } = await fetchJson<{ cart: Cart }>(`/store/carts/${cartId}/promotions`, {
    method: "POST",
    body: JSON.stringify({ promo_codes: [code] }),
  })
  return cart
}

export async function removePromoCode(cartId: string, code: string) {
  const { cart } = await fetchJson<{ cart: Cart }>(`/store/carts/${cartId}/promotions`, {
    method: "DELETE",
    body: JSON.stringify({ promo_codes: [code] }),
  })
  return cart
}

export async function applyBrDiscounts(
  cartId: string,
  opts: {
    free_shipping?: boolean
    coins_to_redeem?: number
    is_pix_selected?: boolean
  }
) {
  const { br_pricing } = await fetchJson<{ br_pricing: BrPricing }>(
    `/store/carts/${cartId}/br-discounts`,
    { method: "POST", body: JSON.stringify(opts) }
  )
  return br_pricing
}

export async function completeCart(cartId: string) {
  return fetchJson<{ type: string; order?: { id: string; display_id: number } ; cart?: Cart }>(
    `/store/carts/${cartId}/complete`,
    { method: "POST" }
  )
}

export async function simulatePixPayment(cartId: string) {
  return fetchJson<{ cart_id: string; status: string }>(
    `/store/pix/simulate-pay/${cartId}`,
    { method: "POST" }
  )
}
