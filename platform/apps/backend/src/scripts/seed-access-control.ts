import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ACCESS_CONTROL_MODULE } from "../modules/access-control"
import { ROLE_DEFINITIONS } from "../modules/access-control/permissions"

/** Chaves presentes na definição mas ausentes na linha já existente. */
export function missingPermissions(
  existing: Record<string, unknown> | null | undefined,
  defined: Record<string, unknown>
): Record<string, unknown> {
  const current = existing ?? {}
  const missing: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(defined)) {
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      missing[key] = value
    }
  }
  return missing
}

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
      const role = existing[0]
      roleIdBySlug[def.slug] = role.id

      // Papéis já semeados não ganham sozinhos as chaves de permissão novas
      // (ex.: `payment_gateway`) — e `isAllowed` trata chave ausente como
      // negado. Adiciona só as chaves que faltam, sem sobrescrever nenhum
      // valor que já exista na linha.
      const missing = missingPermissions(role.permissions, def.permissions)
      if (Object.keys(missing).length) {
        await accessControlService.updateRoles({
          id: role.id,
          permissions: { ...missing, ...(role.permissions ?? {}) },
        })
        logger.info(
          `[access-control] Papel ${def.name}: permissões adicionadas (${Object.keys(missing).join(", ")})`
        )
      }
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
