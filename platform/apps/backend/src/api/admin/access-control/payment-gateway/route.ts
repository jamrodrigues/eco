import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCESS_CONTROL_MODULE } from "../../../../modules/access-control"
import { getPaymentGatewaySettings, updatePaymentGatewaySettings } from "../../../../modules/access-control/payment-gateway"

const GATEWAYS = ["mercadopago", "pagarme"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
  const settings = await getPaymentGatewaySettings(accessControlService)
  res.status(200).json({ settings })
}

type Body = { active_gateway?: "mercadopago" | "pagarme" }

export async function PUT(req: MedusaRequest<Body>, res: MedusaResponse) {
  if (req.body.active_gateway !== undefined && !GATEWAYS.includes(req.body.active_gateway)) {
    res.status(400).json({ message: "active_gateway must be 'mercadopago' or 'pagarme'" })
    return
  }
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
  // Whitelist: only `active_gateway` ever reaches the update — never `id`,
  // `deleted_at` or any other admin-supplied field.
  const settings = await updatePaymentGatewaySettings(accessControlService, {
    active_gateway: req.body.active_gateway,
  })
  res.status(200).json({ settings })
}
