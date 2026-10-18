import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { FRANCHISE_HYPERLOCAL_MODULE } from "../../modules/franchise-hyperlocal"
import { matchFranchiseUnit, FranchiseUnitMatch } from "../../modules/franchise-hyperlocal/match-cep"

declare module "@medusajs/framework/http" {
  interface MedusaRequest {
    franchiseContext?: FranchiseUnitMatch | null
  }
}

/**
 * Lê o CEP do comprador (header `x-buyer-cep` ou `?cep=`) e anexa a
 * franchise_unit correspondente em `req.franchiseContext`, para que
 * qualquer rota `/store/*` (PDP, carrinho, checkout) possa priorizar o
 * estoque local e exibir o selo "Entrega Hoje na Sua Cidade" sem
 * duplicar a lógica de roteamento por CEP (@POSHyperlocal, Fase 4).
 *
 * `GET /store/shipping/cep` já faz esse match diretamente (é o próprio
 * endpoint de cotação); este middleware existe para as DEMAIS rotas.
 */
export async function hyperlocalContext(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const cep = String(req.headers["x-buyer-cep"] || req.query.cep || "")

  if (!cep) {
    req.franchiseContext = null
    return next()
  }

  try {
    const franchiseHyperlocalService = req.scope.resolve(FRANCHISE_HYPERLOCAL_MODULE)
    req.franchiseContext = await matchFranchiseUnit(franchiseHyperlocalService, cep)
  } catch {
    req.franchiseContext = null
  }

  next()
}
