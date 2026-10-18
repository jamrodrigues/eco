import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCESS_CONTROL_MODULE } from "../../../../modules/access-control"
import { getRoleAndPermissionsForUser } from "../../../../modules/access-control/permissions"

/**
 * GET /admin/access-control/me
 *
 * O usuário logado descobre seu próprio papel/permissões — usado pelas
 * telas de Admin custom (PDV, Moedas, Páginas Institucionais,
 * Access Control) para mostrar "Sem permissão" em vez da tela real.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const userId = req.auth_context?.actor_id
  if (!userId) {
    return res.status(401).json({ message: "Não autenticado." })
  }
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
  const result = await getRoleAndPermissionsForUser(accessControlService, userId)
  res.status(200).json(result)
}
