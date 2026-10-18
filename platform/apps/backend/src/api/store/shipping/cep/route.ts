import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { FRANCHISE_HYPERLOCAL_MODULE } from "../../../../modules/franchise-hyperlocal"
import { matchFranchiseUnit } from "../../../../modules/franchise-hyperlocal/match-cep"

type ViaCepResponse = {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

/**
 * GET /store/shipping/cep?cep=01310100
 *
 * Looks up the address via ViaCEP and returns the two BR delivery modes.
 * Express hyperlocal delivery is only offered when the buyer's city
 * matches an active Stock Location's city (@BackendMedusa, Fase 1).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cep = String(req.query.cep || "").replace(/\D/g, "")
  if (cep.length !== 8) {
    return res.status(400).json({
      message: "Informe um CEP válido com 8 dígitos, ex: ?cep=01310100",
    })
  }

  let address: Partial<ViaCepResponse> = {}
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = (await response.json()) as ViaCepResponse
    if (data.erro) {
      return res.status(404).json({ message: "CEP não encontrado." })
    }
    address = data
  } catch {
    // ViaCEP indisponível (ex: sandbox sem acesso externo): segue com
    // a cotação de frete mesmo assim, sem dados de logradouro.
    address = {}
  }

  const franchiseHyperlocalService = req.scope.resolve(FRANCHISE_HYPERLOCAL_MODULE)
  const franchiseMatch = await matchFranchiseUnit(franchiseHyperlocalService, cep)
  const hasLocalStock = !!franchiseMatch

  const options = [
    {
      code: "standard_br",
      name: "Envio Padrão (Transportadora / Correios)",
      amount: 1490,
      eligible_for_free_shipping_coupon: true,
      estimated_days: "3 a 7 dias úteis",
    },
    ...(hasLocalStock
      ? [
          {
            code: "express_hyperlocal_br",
            name: "Entrega Expressa na Sua Cidade (Motoboy / Franqueado Local)",
            amount: 990,
            eligible_for_free_shipping_coupon: false,
            estimated_days: "mesmo dia / dia seguinte",
          },
        ]
      : []),
  ]

  res.status(200).json({
    cep,
    address: {
      logradouro: address.logradouro || null,
      bairro: address.bairro || null,
      cidade: address.localidade || null,
      uf: address.uf || null,
    },
    hyperlocal_match: hasLocalStock,
    hyperlocal_badge: hasLocalStock ? "⚡ Entrega Hoje na Sua Cidade" : null,
    franchise_unit: franchiseMatch,
    shipping_options: options,
  })
}
