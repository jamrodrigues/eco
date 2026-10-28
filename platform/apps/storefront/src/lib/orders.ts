"use client"

import { BACKEND_URL, PUBLISHABLE_KEY } from "./medusa"

export type MyOrder = {
  id: string
  display_id: number
  status: string
  payment_status: string
  total: number
  currency_code: string
  created_at: string
}

/**
 * Pedidos do cliente autenticado (`/conta`). Rota nativa do Medusa
 * (`GET /store/orders`), que já filtra pelo customer do Bearer token --
 * não precisa (nem deveria) passar um filtro de customer_id manual.
 */
export async function listMyOrders(token: string): Promise<MyOrder[]> {
  const res = await fetch(
    `${BACKEND_URL}/store/orders?fields=id,display_id,status,+payment_status,total,currency_code,created_at&order=-created_at`,
    {
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  )
  if (!res.ok) {
    throw new Error(`Não foi possível carregar seus pedidos (${res.status}).`)
  }
  const { orders } = await res.json()
  return orders
}
