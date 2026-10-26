import { MedusaError } from "@medusajs/framework/utils"

const MP_BASE_URL = "https://api.mercadopago.com"

/**
 * Thin wrapper around the Mercado Pago REST API using the global `fetch`
 * (Node 22+), deliberately with no `mercadopago`/`axios` dependency.
 */
export async function mpRequest<T>(
  path: string,
  init: RequestInit & { accessToken: string }
): Promise<T> {
  const { accessToken, headers, ...rest } = init

  const response = await fetch(`${MP_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  const body = await response.json()

  if (!response.ok) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      body?.message || "Mercado Pago request failed"
    )
  }

  return body as T
}
