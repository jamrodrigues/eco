import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { orderConfirmationEmail } from "../modules/email-notifications/templates"

/**
 * E-mail de confirmação de pedido (order.placed — mesmo evento do
 * cashback de moedas, subscriber separado). Sandbox-first: sem
 * RESEND_API_KEY, o próprio provider só loga a mensagem.
 */
export default async function orderPlacedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationModuleService: any = container.resolve(Modules.NOTIFICATION)

  const { data: orders } = await query.graph({
    entity: "order",
    filters: { id: data.id },
    fields: [
      "id",
      "display_id",
      "email",
      "total",
      "currency_code",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "payment_collections.payments.provider_id",
    ],
  })
  const order = orders[0] as any
  if (!order?.email) return

  const providerIds: string[] = (order.payment_collections || [])
    .flatMap((pc: any) => pc.payments || [])
    .map((p: any) => p.provider_id || "")
  const isPix = providerIds.some((id) => id.includes("pix"))

  const email = orderConfirmationEmail({
    displayId: order.display_id,
    total: order.total,
    items: order.items || [],
    isPix,
  })

  await notificationModuleService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-confirmation",
    content: { subject: email.subject, html: email.html },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
