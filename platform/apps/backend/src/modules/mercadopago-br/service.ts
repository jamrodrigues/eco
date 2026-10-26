import {
  AbstractPaymentProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  UpdatePaymentInput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { mpRequest } from "./client"
import { verifyMpSignature } from "./signature"
import { pixStatusEmitter } from "../../api/pix-status/[order_id]/emitter"

export type MercadoPagoBrOptions = {
  accessToken?: string
  publicKey?: string
  webhookSecret?: string
  mode?: "sandbox" | "live"
  method: "pix" | "card" | "boleto"
}

type MpPaymentStatus = "pending" | "captured" | "canceled"

/**
 * Mercado Pago payment provider for the Brasil region.
 *
 * Three instances of this same class are registered in `medusa-config.ts`
 * (`pix_br` / `card_br` / `boleto_br`, one per `options.method`). `initiatePayment`
 * branches on `this.options_.method` because Medusa calls the specific instance
 * the storefront selected for that cart.
 *
 * `getWebhookActionAndData` is different: Mercado Pago only calls ONE webhook
 * URL for the whole integration, and Medusa's `/hooks/payment/:provider` route
 * resolves that call to whichever ONE of the 3 registered instances happens to
 * match the route param — not necessarily the instance that actually created
 * the payment. So this method must NEVER branch on `this.options_.method`; it
 * derives the real payment method from the Mercado Pago API response itself
 * (`payment_method_id`), so the webhook behaves identically no matter which of
 * the 3 instances received the HTTP call.
 */
class MercadoPagoBrService extends AbstractPaymentProvider<MercadoPagoBrOptions> {
  static identifier = "mercadopago-br"

  protected options_: MercadoPagoBrOptions

  constructor(container: any, options: MercadoPagoBrOptions) {
    super(container, options)
    this.options_ = options
  }

  protected isSandbox() {
    return !this.options_.accessToken || this.options_.mode !== "live"
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    if (this.options_.method === "pix") {
      const response = await mpRequest<{
        id: number
        status: string
        date_of_expiration: string
        point_of_interaction: {
          transaction_data: { qr_code: string; qr_code_base64: string }
        }
      }>("/v1/payments", {
        method: "POST",
        accessToken: this.options_.accessToken || "",
        body: JSON.stringify({
          transaction_amount: Number(input.amount) / 100,
          payment_method_id: "pix",
          payer: {
            email: input.context?.customer?.email || "guest@checkout.local",
          },
          description: "Pedido loja",
        }),
      })

      return {
        id: `mercadopago_pix_${response.id}`,
        data: {
          id: `mercadopago_pix_${response.id}`,
          mp_payment_id: response.id,
          cart_id: (input.data as any)?.cart_id,
          provider_method: "pix",
          qr_code_emv: response.point_of_interaction.transaction_data.qr_code,
          qr_code_base64:
            response.point_of_interaction.transaction_data.qr_code_base64,
          expires_at: response.date_of_expiration,
          status: this.mapMpStatus(response.status),
          sandbox: this.isSandbox(),
        },
      }
    }

    if (this.options_.method === "boleto") {
      const payerCpf = (input.data as any)?.payer_cpf

      if (!payerCpf) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "CPF obrigatório para boleto"
        )
      }

      const response = await mpRequest<{
        id: number
        status: string
        date_of_expiration: string
        transaction_details: {
          external_resource_url: string
          barcode: { content: string }
        }
      }>("/v1/payments", {
        method: "POST",
        accessToken: this.options_.accessToken || "",
        body: JSON.stringify({
          transaction_amount: Number(input.amount) / 100,
          payment_method_id: "bolbradesco",
          payer: {
            email: input.context?.customer?.email || "guest@checkout.local",
            identification: { type: "CPF", number: payerCpf },
          },
          description: "Pedido loja",
        }),
      })

      return {
        id: `mercadopago_boleto_${response.id}`,
        data: {
          id: `mercadopago_boleto_${response.id}`,
          mp_payment_id: response.id,
          cart_id: (input.data as any)?.cart_id,
          provider_method: "boleto",
          linha_digitavel: response.transaction_details.barcode.content,
          due_date: response.date_of_expiration,
          status: this.mapMpStatus(response.status),
          sandbox: this.isSandbox(),
        },
      }
    }

    if (this.options_.method === "card") {
      const token = (input.data as any)?.token
      const installments = (input.data as any)?.installments

      const response = await mpRequest<{
        id: number
        status: string
        status_detail?: string
      }>("/v1/payments", {
        method: "POST",
        accessToken: this.options_.accessToken || "",
        body: JSON.stringify({
          transaction_amount: Number(input.amount) / 100,
          token,
          installments,
          payer: {
            email: input.context?.customer?.email || "guest@checkout.local",
          },
          description: "Pedido loja",
        }),
      })

      if (response.status === "rejected") {
        throw new MedusaError(
          MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          response.status_detail || "Pagamento recusado"
        )
      }

      return {
        id: `mercadopago_card_${response.id}`,
        data: {
          id: `mercadopago_card_${response.id}`,
          mp_payment_id: response.id,
          cart_id: (input.data as any)?.cart_id,
          provider_method: "card",
          max_installments: 12,
          status: this.mapMpStatus(response.status),
          sandbox: this.isSandbox(),
        },
      }
    }

    throw new Error(
      `MercadoPagoBrService: unsupported method "${this.options_.method}"`
    )
  }

  async authorizePayment(
    input: any
  ): Promise<{ data: any; status: "authorized" }> {
    return { data: input.data, status: "authorized" }
  }

  async capturePayment(input: any) {
    return { data: { ...input.data, status: "captured" } }
  }

  async cancelPayment(input: any) {
    return { data: { ...input.data, status: "canceled" } }
  }

  async deletePayment(input: any) {
    return { data: { ...input.data } }
  }

  async refundPayment(input: any) {
    return { data: { ...input.data, status: "refunded" } }
  }

  async retrievePayment(input: any) {
    return { data: input.data }
  }

  async updatePayment(input: UpdatePaymentInput) {
    return { data: input.data }
  }

  async getPaymentStatus(input: any) {
    return { status: input.data?.status || "pending" }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const data = payload.data as any
    const headers = (payload.headers || {}) as Record<string, string>

    const signatureOk = this.verifySignature({
      xSignature: headers["x-signature"],
      xRequestId: headers["x-request-id"],
      dataId: String(data.id),
    })

    if (!signatureOk) {
      return { action: "not_supported" }
    }

    const response = await mpRequest<{
      id: number
      status: string
      payment_method_id?: string
      transaction_amount: number
      metadata?: { cart_id?: string }
    }>(`/v1/payments/${data.id}`, {
      method: "GET",
      accessToken: this.options_.accessToken || "",
    })

    const derivedMethod = this.derivePaymentMethod(response.payment_method_id)
    const sessionId = `mercadopago_${derivedMethod}_${response.id}`
    const mappedStatus = this.mapMpStatus(response.status)

    if (derivedMethod === "pix" && mappedStatus === "captured") {
      pixStatusEmitter.emit(
        response.metadata?.cart_id ?? String(data.id),
        { status: "paid" }
      )
    }

    return {
      action: mappedStatus,
      data: { session_id: sessionId, amount: response.transaction_amount },
    }
  }

  /**
   * Derives which payment method actually created the Mercado Pago payment
   * from the API response itself — never from `this.options_.method` (see
   * class-level note on why `getWebhookActionAndData` can't branch on it).
   */
  private derivePaymentMethod(
    paymentMethodId: string | undefined
  ): "pix" | "boleto" | "card" {
    if (paymentMethodId === "pix") {
      return "pix"
    }
    if (paymentMethodId === "bolbradesco") {
      return "boleto"
    }
    return "card"
  }

  private verifySignature(args: {
    xSignature: string | undefined
    xRequestId: string | undefined
    dataId: string
  }): boolean {
    return verifyMpSignature({
      xSignature: args.xSignature,
      xRequestId: args.xRequestId,
      dataId: args.dataId,
      secret: this.options_.webhookSecret || "",
    })
  }

  private mapMpStatus(mpStatus: string): MpPaymentStatus {
    if (mpStatus === "approved") {
      return "captured"
    }
    if (mpStatus === "pending" || mpStatus === "in_process") {
      return "pending"
    }
    return "canceled"
  }
}

export default MercadoPagoBrService
