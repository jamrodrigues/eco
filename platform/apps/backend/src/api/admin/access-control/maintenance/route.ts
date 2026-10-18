import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCESS_CONTROL_MODULE } from "../../../../modules/access-control"
import { getMaintenanceSettings, updateMaintenanceSettings } from "../../../../modules/access-control/maintenance"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
  const settings = await getMaintenanceSettings(accessControlService)
  res.status(200).json({ settings })
}

type Body = { is_enabled?: boolean; message?: string | null }

export async function PUT(req: MedusaRequest<Body>, res: MedusaResponse) {
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
  const settings = await updateMaintenanceSettings(accessControlService, req.body)
  res.status(200).json({ settings })
}
