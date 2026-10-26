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

  if (!response.ok) {
    // Non-2xx error bodies aren't guaranteed to be valid JSON (empty bodies
    // on some 401/500/502/504s are common) — never let a parse failure here
    // crash the caller with a raw SyntaxError instead of a clean MedusaError.
    let errorBody: any = {}
    try {
      errorBody = await response.json()
    } catch {
      errorBody = {}
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      errorBody?.message || "Mercado Pago request failed"
    )
  }

  const body = await response.json()
  return body as T
}
