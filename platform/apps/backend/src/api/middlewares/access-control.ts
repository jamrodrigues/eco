import type {
  AuthContext,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ACCESS_CONTROL_MODULE } from "../../modules/access-control"
import {
  classifyAdminPath,
  getRoleAndPermissionsForUser,
  isAllowed,
} from "../../modules/access-control/permissions"

/**
 * Bloqueio de verdade (403 no servidor, não só esconder botão) por
 * papel de admin. Não dá pra esconder itens nativos do menu lateral do
 * Medusa Admin por papel nesta versão — a proteção real é aqui: tentar
 * salvar algo em /admin/store, /admin/users etc sem permissão falha
 * com 403, mesmo que o item continue visível no menu.
 */
export async function accessControlGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const category = classifyAdminPath(req.path)
  if (!category) return next()

  const userId = (req as unknown as { auth_context?: AuthContext }).auth_context?.actor_id
  if (!userId) return next() // deixa o auth nativo do Medusa barrar isso

  try {
    const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
    const { permissions } = await getRoleAndPermissionsForUser(accessControlService, userId)

    if (!isAllowed(permissions, category, req.method)) {
      return res.status(403).json({
        message: `Seu papel não tem permissão para "${category}".`,
      })
    }
  } catch {
    // Módulo de access-control indisponível (ex: boot antes da
    // migration rodar) — nunca travar o admin por isso.
    return next()
  }

  next()
}
