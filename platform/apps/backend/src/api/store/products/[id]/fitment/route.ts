import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/products/:id/fitment
 *
 * A rota nativa `/store/products` do Medusa tem uma allowlist de campos
 * (query-config.js) que inclui `metadata` do produto mas NÃO
 * `variants.metadata` — fica sempre vazio independente do `fields`
 * pedido (achado testando o filtro de compatibilidade de verdade no
 * browser, Fase 5). Esta rota expõe só os 4 campos de fitment que
 * precisam ser públicos (oem_part_number/ean_barcode/
 * compatible_motorcycles/viscosity_or_spec — ver
 * src/modules/motorcycle-fitment), não o metadata inteiro da variante.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "metadata"],
    filters: { product_id: id },
  })

  const fitment: Record<string, Record<string, unknown>> = {}
  for (const v of variants as any[]) {
    const m = v.metadata || {}
    fitment[v.id] = {
      oem_part_number: m.oem_part_number,
      ean_barcode: m.ean_barcode,
      compatible_motorcycles: m.compatible_motorcycles,
      viscosity_or_spec: m.viscosity_or_spec,
    }
  }

  res.status(200).json({ fitment })
}
