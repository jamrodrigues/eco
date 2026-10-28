"use client"

import { BACKEND_URL, PUBLISHABLE_KEY } from "./medusa"

export type CustomerAddress = {
  id: string
  address_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  company: string | null
  address_1: string | null
  address_2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country_code: string | null
  is_default_shipping: boolean
  is_default_billing: boolean
}

export type AddressInput = {
  address_name?: string
  first_name: string
  last_name: string
  phone?: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Endereços salvos do cliente -- usa as rotas nativas do Medusa
 * (`/store/customers/me/addresses[...]`), já autenticadas e escopadas
 * pelo customer do Bearer token (`req.auth_context.actor_id`), sem
 * necessidade de rota própria.
 */
export async function listMyAddresses(token: string): Promise<CustomerAddress[]> {
  const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses`, {
    headers: authHeaders(token),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Não foi possível carregar seus endereços (${res.status}).`)
  const { addresses } = await res.json()
  return addresses
}

export async function createMyAddress(token: string, input: AddressInput): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ ...input, country_code: input.country_code.toLowerCase() }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Não foi possível salvar o endereço (${res.status}).`)
  }
}

export async function updateMyAddress(
  token: string,
  addressId: string,
  input: Partial<AddressInput>
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses/${addressId}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(
      input.country_code ? { ...input, country_code: input.country_code.toLowerCase() } : input
    ),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Não foi possível atualizar o endereço (${res.status}).`)
  }
}

export async function deleteMyAddress(token: string, addressId: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/store/customers/me/addresses/${addressId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Não foi possível excluir o endereço (${res.status}).`)
}
