import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { welcomeEmail } from "../modules/email-notifications/templates"

/**
 * E-mail de boas-vindas: dispara só pra cadastro real, nunca pro
 * customer convidado (cus_guest_dev). customer.created dispara pros
 * dois casos (guest-customer/route.ts também usa createCustomersWorkflow,
 * ver comentário lá), então o diferencial correto é `has_account` — o
 * createCustomerAccountWorkflow nativo do Medusa (usado pelo registro
 * real em POST /store/customers) seta has_account=true quando existe
 * authIdentityId; o guest nunca passa por ali, então nunca tem true.
 */
export default async function customerCreatedWelcomeEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationModuleService: any = container.resolve(Modules.NOTIFICATION)

  const { data: customers } = await query.graph({
    entity: "customer",
    filters: { id: data.id },
    fields: ["id", "email", "first_name", "has_account"],
  })
  const customer = customers[0] as any
  if (!customer?.has_account || !customer.email) return

  const email = welcomeEmail({ firstName: customer.first_name })

  await notificationModuleService.createNotifications({
    to: customer.email,
    channel: "email",
    template: "welcome",
    content: { subject: email.subject, html: email.html },
  })
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
