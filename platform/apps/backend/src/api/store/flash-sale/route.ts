import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { resolveFlashSale } from "./resolve"

/**
 * GET /store/flash-sale
 *
 * Pública. Diz se há oferta relâmpago ativa (price list nativa do tipo Sale
 * dentro do período) e quais produtos ela cobre. Sem oferta: `{ active: false }`.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const result = await resolveFlashSale(
    {
      pricing: req.scope.resolve(Modules.PRICING),
      query: req.scope.resolve(ContainerRegistrationKeys.QUERY),
    },
    new Date()
  )

  res.setHeader("Cache-Control", "public, max-age=60")
  res.json(result)
}
