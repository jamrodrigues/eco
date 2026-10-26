import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ACCESS_CONTROL_MODULE } from "../../../modules/access-control"
import { getPaymentGatewaySettings } from "../../../modules/access-control/payment-gateway"

/**
 * GET /store/payment-gateway-status (public, no auth)
 *
 * The storefront calls this before creating a payment session to learn
 * which payment gateway is currently active.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
  const settings = await getPaymentGatewaySettings(accessControlService)
  res.status(200).json({ active_gateway: settings.active_gateway })
}
