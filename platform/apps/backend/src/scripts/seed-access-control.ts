import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ACCESS_CONTROL_MODULE } from "../modules/access-control"
import { ROLE_DEFINITIONS } from "../modules/access-control/permissions"

/**
 * Seed dos 4 papéis fixos + atribui super_admin pro primeiro usuário
 * admin existente (rede de segurança — usuário sem papel já cai em
 * super_admin por padrão, isso só deixa explícito).
 */
export default async function seedAccessControl({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const accessControlService: any = container.resolve(ACCESS_CONTROL_MODULE)
  const userModuleService: any = container.resolve(Modules.USER)

  const roleIdBySlug: Record<string, string> = {}

  for (const def of ROLE_DEFINITIONS) {
    const existing = await accessControlService.listRoles({ slug: def.slug })
    if (existing.length) {
      roleIdBySlug[def.slug] = existing[0].id
      continue
    }
    const [created] = await accessControlService.createRoles([
      { slug: def.slug, name: def.name, permissions: def.permissions },
    ])
    roleIdBySlug[def.slug] = created.id
    logger.info(`[access-control] Papel criado: ${def.name}`)
  }

  const users = await userModuleService.listUsers({})
  for (const user of users) {
    const existingAssignment = await accessControlService.listUserRoles({ user_id: user.id })
    if (existingAssignment.length) continue
    await accessControlService.createUserRoles([
      { user_id: user.id, role_id: roleIdBySlug["super_admin"] },
    ])
    logger.info(`[access-control] ${user.email} -> super_admin`)
  }

  logger.info("[access-control] Seed concluído.")
}
