import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"

type Options = {
  apiKey?: string
  fromEmail?: string
}

type InjectedDependencies = {
  logger: Logger
}

/**
 * Provider de e-mail transacional. Roda em modo sandbox (so loga a
 * mensagem) quando RESEND_API_KEY nao esta setada, no mesmo padrao do
 * pagarme-br pra pagamentos: funciona sem credenciais externas no dev
 * e nos testes, e manda de verdade via Resend quando a chave existe.
 * Chama a API REST do Resend direto (fetch), sem SDK, pra nao precisar
 * instalar dependencia nova.
 */
class EmailNotificationsService extends AbstractNotificationProviderService {
  static identifier = "email-notifications"

  protected logger_: Logger
  protected options_: Options

  constructor({ logger }: InjectedDependencies, options: Options) {
    super()
    this.logger_ = logger
    this.options_ = options
  }

  protected isSandbox() {
    return !this.options_.apiKey
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const subject = notification.content?.subject || notification.template
    const html = notification.content?.html || notification.content?.text || ""

    if (this.isSandbox()) {
      this.logger_.info(
        `[email-notifications][sandbox] Para: ${notification.to} | Assunto: "${subject}" | Template: ${notification.template}\n--- corpo (texto) ---\n${this.stripHtml(html)}`
      )
      return {}
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.options_.fromEmail || "onboarding@resend.dev",
        to: [notification.to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      this.logger_.error(`[email-notifications] Falha ao enviar via Resend: ${response.status} ${body}`)
      throw new Error(`Resend respondeu ${response.status}`)
    }

    const result = (await response.json()) as { id?: string }
    return { id: result.id }
  }

  private stripHtml(html: string) {
    // Troca <a href="URL">texto</a> por "texto (URL)" antes de tirar as
    // outras tags, senao o link (ex: token de reset de senha) some do
    // log em modo sandbox.
    const withLinks = html.replace(
      /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
      "$2 ($1)"
    )
    return withLinks.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  }
}

export default EmailNotificationsService
