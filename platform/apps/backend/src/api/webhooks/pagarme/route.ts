import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { pixStatusEmitter } from "../../store/pix/status/[order_id]/emitter"

/**
 * POST /webhooks/pagarme
 *
 * Recebe o evento `order.paid` do Pagar.me (ou da rota de simulação local)
 * e notifica o canal SSE de status do pedido (@BackendMedusa, Fase 1).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as any
  if (body?.event !== "order.paid") {
    return res.status(200).json({ received: true, ignored: true })
  }

  const orderId = body.order_id || body.data?.order_id
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`[pagarme-webhook] order.paid recebido para ${orderId}`)

  if (orderId) {
    pixStatusEmitter.emit(orderId, { status: "paid", order_id: orderId })
  }

  res.status(200).json({ received: true })
}
