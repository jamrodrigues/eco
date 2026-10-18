import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCESS_CONTROL_MODULE } from "../../../../../modules/access-control"

type Body = { role_slug: string }

/**
 * PUT /admin/access-control/users/:id
 *
 * Atribui/troca o papel de um usuário admin.
 */
export async function PUT(req: MedusaRequest<Body>, res: MedusaResponse) {
  const { id } = req.params
  const { role_slug } = req.body
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)

  const roles = await accessControlService.listRoles({ slug: role_slug })
  const role = roles[0]
  if (!role) {
    return res.status(400).json({ message: `Papel "${role_slug}" não existe.` })
  }

  const existing = await accessControlService.listUserRoles({ user_id: id })
  if (existing.length) {
    await accessControlService.updateUserRoles({ id: existing[0].id, role_id: role.id })
  } else {
    await accessControlService.createUserRoles([{ user_id: id, role_id: role.id }])
  }

  res.status(200).json({ user_id: id, role_slug: role.slug, role_name: role.name })
}
