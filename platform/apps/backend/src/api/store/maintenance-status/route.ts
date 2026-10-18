import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCESS_CONTROL_MODULE } from "../../../modules/access-control"
import { getMaintenanceSettings } from "../../../modules/access-control/maintenance"

/**
 * GET /store/maintenance-status (público, sem auth)
 *
 * O storefront consulta isso no middleware de borda (Next.js) antes de
 * renderizar qualquer página.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
  const settings = await getMaintenanceSettings(accessControlService)
  res.status(200).json({
    is_enabled: settings.is_enabled,
    message: settings.message,
  })
}
