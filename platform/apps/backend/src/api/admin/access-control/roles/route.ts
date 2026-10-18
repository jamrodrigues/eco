import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ROLE_DEFINITIONS } from "../../../../modules/access-control/permissions"

/**
 * GET /admin/access-control/roles
 *
 * Matriz de permissões fixa dos 4 papéis — só leitura, sem editor
 * nesta versão (ver nota em permissions.ts).
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({ roles: ROLE_DEFINITIONS })
}
