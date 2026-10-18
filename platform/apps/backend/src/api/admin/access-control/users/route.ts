import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ACCESS_CONTROL_MODULE } from "../../../../modules/access-control"

/**
 * GET /admin/access-control/users
 *
 * Lista os usuários admin (módulo core User, só leitura) com o papel
 * atual de cada um, para a tela /app/access-control atribuir papéis.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const userModuleService: any = req.scope.resolve(Modules.USER)
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)

  const users = await userModuleService.listUsers({})
  const roles = await accessControlService.listRoles({})
  const roleById = Object.fromEntries(roles.map((r: any) => [r.id, r]))

  const assignments = await accessControlService.listUserRoles({
    user_id: users.map((u: any) => u.id),
  })
  const roleIdByUserId = Object.fromEntries(
    assignments.map((a: any) => [a.user_id, a.role_id])
  )

  const result = users.map((u: any) => {
    const roleId = roleIdByUserId[u.id]
    const role = roleId ? roleById[roleId] : null
    return {
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role_slug: role?.slug ?? "super_admin",
      role_name: role?.name ?? "Super Admin (padrão)",
    }
  })

  res.status(200).json({ users: result })
}
