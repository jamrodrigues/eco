import crypto from "crypto"
import {
  AbstractPaymentProvider,
  BigNumber,
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

/** Raw Mercado Pago payment statuses we may act on when voiding a payment. */
const MP_CANCELABLE_STATUSES = ["pending", "in_process", "authorized"]
const MP_REFUNDABLE_STATUSES = ["approved"]

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
 * resolves the Medusa payment session from the `metadata.medusa_session_id`
 * that `initiatePayment` attached to the Mercado Pago payment, so the webhook
 * behaves identically no matter which of the 3 instances received the HTTP call.
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

  /**
   * Medusa creates the real `payment_session` row (id `payses_...`) BEFORE it
   * calls `initiatePayment`, and passes that id both as `input.data.session_id`
   * and as `input.context.idempotency_key` (see
   * `@medusajs/payment` `PaymentModuleService.createPaymentSession`).
   */
  private medusaSessionId(input: InitiatePaymentInput): string | undefined {
    return (
      ((input.data as any)?.session_id as string | undefined) ??
      input.context?.idempotency_key
    )
  }

  /**
   * Common fields for every `POST /v1/payments` call: `metadata` lets the
   * webhook map the Mercado Pago payment back to the real Medusa session and
   * cart, and the `X-Idempotency-Key` (the Medusa session id) makes a retried
   * request for the same session reuse the same Mercado Pago payment instead of
   * creating (and, for card, charging) a second one.
   */
  private async createMpPayment<T>(
    input: InitiatePaymentInput,
    body: Record<string, unknown>
  ): Promise<T> {
    const sessionId = this.medusaSessionId(input)
    const cartId = (input.data as any)?.cart_id as string | undefined

    return mpRequest<T>("/v1/payments", {
      method: "POST",
      accessToken: this.options_.accessToken || "",
      headers: {
        "X-Idempotency-Key": sessionId ?? crypto.randomUUID(),
      },
      body: JSON.stringify({
        ...body,
        metadata: {
          medusa_session_id: sessionId,
          cart_id: cartId,
        },
      }),
    })
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    if (this.options_.method === "pix") {
      const response = await this.createMpPayment<{
        id: number
        status: string
        date_of_expiration: string
        point_of_interaction: {
          transaction_data: { qr_code: string; qr_code_base64: string }
        }
      }>(input, {
        transaction_amount: Number(input.amount) / 100,
        payment_method_id: "pix",
        payer: {
          email: input.context?.customer?.email || "guest@checkout.local",
        },
        description: "Pedido loja",
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

      const response = await this.createMpPayment<{
        id: number
        status: string
        date_of_expiration: string
        transaction_details: {
          external_resource_url: string
          barcode: { content: string }
        }
      }>(input, {
        transaction_amount: Number(input.amount) / 100,
        payment_method_id: "bolbradesco",
        payer: {
          email: input.context?.customer?.email || "guest@checkout.local",
          identification: { type: "CPF", number: payerCpf },
        },
        description: "Pedido loja",
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
      const paymentMethodId = (input.data as any)?.payment_method_id

      if (!paymentMethodId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "payment_method_id obrigatório"
        )
      }

      const response = await this.createMpPayment<{
        id: number
        status: string
        status_detail?: string
      }>(input, {
        transaction_amount: Number(input.amount) / 100,
        token,
        installments,
        payment_method_id: paymentMethodId,
        payer: {
          email: input.context?.customer?.email || "guest@checkout.local",
        },
        description: "Pedido loja",
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

  /**
   * Marks the session data as authorized so `deletePayment` can tell a session
   * that became a real Medusa Payment (never auto-void it) from an abandoned one.
   */
  async authorizePayment(
    input: any
  ): Promise<{ data: any; status: "authorized" }> {
    return {
      data: { ...input.data, medusa_authorized: true },
      status: "authorized",
    }
  }

  async capturePayment(input: any) {
    return { data: { ...input.data, status: "captured" } }
  }

  /**
   * Voids the Mercado Pago payment behind this session for real. Mercado Pago
   * only allows `canceled` on pending / in-process payments, so an already
   * approved payment (e.g. a card charged synchronously in `initiatePayment`)
   * is fully refunded instead. The live MP status is fetched first rather than
   * trusting the possibly-stale status stored in the session data.
   */
  async cancelPayment(input: any) {
    const data = await this.voidMpPayment(
      input.data,
      input.context?.idempotency_key
    )
    return { data }
  }

  /**
   * Called when Medusa deletes a payment session (e.g. the storefront retries
   * checkout, which replaces the cart's session with a new one). A deleted
   * session never becomes an order, so its Mercado Pago payment is voided —
   * otherwise a retried card checkout would leave the first charge in place.
   * Sessions that were already authorized into a Medusa Payment are never
   * voided here; those go through `cancelPayment`/`refundPayment` explicitly.
   */
  async deletePayment(input: any) {
    if (input.data?.medusa_authorized) {
      return { data: { ...input.data } }
    }
    const data = await this.voidMpPayment(input.data, undefined)
    return { data }
  }

  async refundPayment(input: any) {
    const mpPaymentId = input.data?.mp_payment_id

    if (!mpPaymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mercado Pago: pagamento sem mp_payment_id, não é possível estornar"
      )
    }

    // Medusa amounts in this store are in cents; Mercado Pago wants reais.
    const amountCents = new BigNumber(input.amount).numeric
    const refund = await mpRequest<{ id: number; status?: string }>(
      `/v1/payments/${mpPaymentId}/refunds`,
      {
        method: "POST",
        accessToken: this.options_.accessToken || "",
        headers: {
          "X-Idempotency-Key":
            input.context?.idempotency_key ?? crypto.randomUUID(),
        },
        body: JSON.stringify({ amount: Math.round(amountCents) / 100 }),
      }
    )

    return {
      data: {
        ...input.data,
        mp_refund_ids: [...(input.data?.mp_refund_ids ?? []), refund.id],
      },
    }
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
    // Medusa's `/hooks/payment/:provider` route passes `req.body` verbatim as
    // `payload.data` (the query string is NOT forwarded). Mercado Pago's
    // webhook body is `{ id: <notification id>, type: "payment",
    // action: "payment.created", data: { id: <payment id> } }` — the top-level
    // `id` is the NOTIFICATION id; the payment id is nested at `data.id`.
    const body = (payload.data || {}) as any
    const headers = (payload.headers || {}) as Record<string, string>

    const topic = body.type ?? body.topic
    if (topic !== "payment") {
      return { action: "not_supported" }
    }

    const paymentId = body.data?.id
    if (paymentId === undefined || paymentId === null || paymentId === "") {
      return { action: "not_supported" }
    }

    // Mercado Pago signs `id:<data.id>;...` and documents that alphanumeric
    // ids must be lowercased in the manifest (payment ids are numeric).
    const dataId = String(paymentId).toLowerCase()

    const signatureOk = this.verifySignature({
      xSignature: headers["x-signature"],
      xRequestId: headers["x-request-id"],
      dataId,
    })

    if (!signatureOk) {
      return { action: "not_supported" }
    }

    const response = await mpRequest<{
      id: number
      status: string
      payment_method_id?: string
      transaction_amount: number
      metadata?: { medusa_session_id?: string; cart_id?: string }
    }>(`/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      method: "GET",
      accessToken: this.options_.accessToken || "",
    })

    const sessionId = response.metadata?.medusa_session_id
    if (!sessionId) {
      // Not a payment created by this integration (or created before the
      // metadata was added) — there is no Medusa session to act on.
      return { action: "not_supported" }
    }

    const mappedStatus = this.mapMpStatus(response.status)
    const cartId = response.metadata?.cart_id

    if (response.payment_method_id === "pix" && mappedStatus === "captured" && cartId) {
      // The storefront success page listens on `/pix-status/:cart_id`.
      pixStatusEmitter.emit(cartId, { status: "paid" })
    }

    return {
      action: mappedStatus,
      data: {
        session_id: sessionId,
        // Mercado Pago reports reais; Medusa amounts in this store are cents.
        amount: Math.round(Number(response.transaction_amount) * 100),
      },
    }
  }

  /**
   * Cancels (pending) or fully refunds (approved) the Mercado Pago payment
   * referenced by `data.mp_payment_id`. No-op when there is no MP payment yet
   * or it is already in a terminal non-paid state.
   */
  private async voidMpPayment(
    data: Record<string, any> | undefined,
    idempotencyKey: string | undefined
  ): Promise<Record<string, any>> {
    const mpPaymentId = data?.mp_payment_id
    if (!mpPaymentId) {
      return { ...(data ?? {}) }
    }

    const accessToken = this.options_.accessToken || ""
    const current = await mpRequest<{ id: number; status: string }>(
      `/v1/payments/${mpPaymentId}`,
      { method: "GET", accessToken }
    )

    if (MP_CANCELABLE_STATUSES.includes(current.status)) {
      await mpRequest(`/v1/payments/${mpPaymentId}`, {
        method: "PUT",
        accessToken,
        headers: {
          "X-Idempotency-Key": idempotencyKey ?? `cancel_${mpPaymentId}`,
        },
        body: JSON.stringify({ status: "canceled" }),
      })
      return { ...data, status: "canceled" }
    }

    if (MP_REFUNDABLE_STATUSES.includes(current.status)) {
      // Empty body = full refund.
      await mpRequest(`/v1/payments/${mpPaymentId}/refunds`, {
        method: "POST",
        accessToken,
        headers: {
          "X-Idempotency-Key": idempotencyKey ?? `void_refund_${mpPaymentId}`,
        },
        body: JSON.stringify({}),
      })
      return { ...data, status: "canceled", mp_voided_by_refund: true }
    }

    return { ...data, status: "canceled" }
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
