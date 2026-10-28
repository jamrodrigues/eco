"use client"

import { BACKEND_URL, PUBLISHABLE_KEY } from "./medusa"

export type CoinTransaction = {
  id: string
  amount: number
  type:
    | "purchase_cashback"
    | "signup_bonus"
    | "review_bonus"
    | "referral_bonus"
    | "redeemed"
    | "expired"
    | "manual_admin_adjust"
  reference_id: string | null
  expires_at: string | null
  note: string | null
  created_at: string
}

export type MyCoins = {
  coins_balance: number
  ledger: CoinTransaction[]
}

/**
 * Saldo + extrato de moedas do cliente autenticado (`/conta`). Rota
 * própria (`GET /store/customers/me/coins`), não a `/store/carts/:id/coins`
 * (essa é escopada por carrinho, pro funil de checkout sem sessão).
 */
export async function getMyCoins(token: string): Promise<MyCoins> {
  const res = await fetch(`${BACKEND_URL}/store/customers/me/coins`, {
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Não foi possível carregar suas moedas (${res.status}).`)
  }
  return res.json()
}
