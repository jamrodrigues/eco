import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { INSTITUTIONAL_PAGES_MODULE } from "../../../../modules/institutional-pages"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve(INSTITUTIONAL_PAGES_MODULE)
  try {
    const page = await service.retrieveInstitutionalPage(req.params.id)
    res.status(200).json({ institutional_page: page })
  } catch {
    res.status(404).json({ message: "Página não encontrada." })
  }
}

type UpdateBody = { slug?: string; title?: string; body?: string[] }

export async function PUT(req: MedusaRequest<UpdateBody>, res: MedusaResponse) {
  const service: any = req.scope.resolve(INSTITUTIONAL_PAGES_MODULE)
  try {
    const page = await service.updateInstitutionalPages({
      id: req.params.id,
      ...req.body,
    })
    res.status(200).json({ institutional_page: page })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve(INSTITUTIONAL_PAGES_MODULE)
  await service.deleteInstitutionalPages(req.params.id)
  res.status(200).json({ id: req.params.id, deleted: true })
}
