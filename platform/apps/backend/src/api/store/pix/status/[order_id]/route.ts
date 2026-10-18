import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { pixStatusEmitter } from "./emitter"

/**
 * GET /store/pix/status/:order_id (Server-Sent Events)
 *
 * A tela de pedido assina este stream e troca "Aguardando confirmação
 * bancária..." por "Pagamento Confirmado!" assim que o webhook do
 * Pagar.me (ou a simulação local) dispara o evento `order.paid`.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { order_id } = req.params

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  res.write(
    `data: ${JSON.stringify({
      status: "pending",
      message: "Aguardando confirmação bancária...",
    })}\n\n`
  )

  const onPaid = (payload: Record<string, unknown>) => {
    res.write(
      `data: ${JSON.stringify({
        status: "paid",
        message: "Pagamento Confirmado!",
        ...payload,
      })}\n\n`
    )
    res.end()
  }

  pixStatusEmitter.once(order_id, onPaid)

  req.on("close", () => {
    pixStatusEmitter.off(order_id, onPaid)
  })
}
