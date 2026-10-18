import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSTITUTIONAL_PAGES_MODULE } from "../../../../modules/institutional-pages"

/**
 * GET /store/institutional-pages/:slug — leitura publica, sem auth
 * (mesmo padrao do GET /store/shipping/cep).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve(INSTITUTIONAL_PAGES_MODULE)
  const [page] = await service.listInstitutionalPages({ slug: req.params.slug })

  if (!page) {
    return res.status(404).json({ message: "Página não encontrada." })
  }

  res.status(200).json({ title: page.title, body: page.body })
}
