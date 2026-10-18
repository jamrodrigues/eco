import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSTITUTIONAL_PAGES_MODULE } from "../../../modules/institutional-pages"

/**
 * GET /admin/institutional-pages — lista todas (para a tela de CMS).
 * POST /admin/institutional-pages — cria uma nova pagina.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve(INSTITUTIONAL_PAGES_MODULE)
  const pages = await service.listInstitutionalPages({}, { order: { slug: "ASC" } })
  res.status(200).json({ institutional_pages: pages })
}

type CreateBody = { slug: string; title: string; body: string[] }

export async function POST(req: MedusaRequest<CreateBody>, res: MedusaResponse) {
  const service: any = req.scope.resolve(INSTITUTIONAL_PAGES_MODULE)
  const { slug, title, body } = req.body

  if (!slug || !title || !Array.isArray(body)) {
    return res.status(400).json({ message: "slug, title e body (array) são obrigatórios." })
  }

  const existing = await service.listInstitutionalPages({ slug })
  if (existing.length > 0) {
    return res.status(409).json({ message: `Já existe uma página com slug "${slug}".` })
  }

  const page = await service.createInstitutionalPages({ slug, title, body })
  res.status(201).json({ institutional_page: page })
}
