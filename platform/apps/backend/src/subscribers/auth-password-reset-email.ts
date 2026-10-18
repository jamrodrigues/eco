import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { passwordResetEmail } from "../modules/email-notifications/templates"

const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:3000"

type PasswordResetEventData = {
  entity_id: string // e-mail, para o provider emailpass
  actor_type: string
  token: string
}

/**
 * E-mail de redefinição de senha — disparado pelo evento nativo
 * auth.password_reset (generateResetPasswordTokenWorkflow, acionado por
 * POST /auth/customer/emailpass/reset-password). O token vai como query
 * param pro storefront montar a tela de nova senha.
 */
export default async function authPasswordResetEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetEventData>) {
  if (data.actor_type !== "customer") return

  const notificationModuleService: any = container.resolve(Modules.NOTIFICATION)

  const resetUrl = `${STOREFRONT_URL}/redefinir-senha?token=${encodeURIComponent(
    data.token
  )}&email=${encodeURIComponent(data.entity_id)}`

  const email = passwordResetEmail({ resetUrl })

  await notificationModuleService.createNotifications({
    to: data.entity_id,
    channel: "email",
    template: "password-reset",
    content: { subject: email.subject, html: email.html },
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
