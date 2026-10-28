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

type MpOrderPayment = {
  id: string
  amount: string
  status: string
  status_detail?: string
  date_of_expiration?: string
  payment_method?: {
    id?: string
    type?: string
    qr_code?: string
    qr_code_base64?: string
    ticket_url?: string
    digitable_line?: string
  }
}

type MpOrderResponse = {
  id: string
  status: string
  status_detail?: string
  external_reference?: string
  total_amount: string
  transactions: { payments: MpOrderPayment[] }
}

/** Order statuses Mercado Pago lets us `POST /cancel` (vs. needing a refund). */
const MP_CANCELABLE_ORDER_STATUSES = ["created", "action_required"]

/** Joins session id + cart id inside `external_reference` — see buildExternalReference. */
const EXTERNAL_REF_SEPARATOR = "__"

/**
 * Mercado Pago payment provider for the Brasil region, built on the
 * **Orders API** (`/v1/orders`) — the legacy `/v1/payments` endpoint is
 * rejected for this application with "Unauthorized use of live credentials"
 * even for sandbox test cards (Mercado Pago now requires the Orders API for
 * new applications; confirmed directly against the live API during manual
 * testing).
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
 * the order. So this method must NEVER branch on `this.options_.method`; it
 * resolves the Medusa payment session from `external_reference` (see
 * `buildExternalReference`), so the webhook behaves identically no matter
 * which of the 3 instances received the HTTP call.
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
   * The Orders API has no `metadata` field (unlike the legacy Payments API
   * this module used before), so the real Medusa session id travels in
   * `external_reference` instead — the only free-form field Mercado Pago
   * echoes back in both the create response and the webhook payload. The
   * cart id (needed only for the pix success-page SSE) rides along in the
   * same string, since there is nowhere else to put it.
   *
   * `external_reference` is capped at 64 characters by Mercado Pago; both
   * Medusa ids together with their `payses_`/`cart_` prefixes exceed that,
   * so the prefixes are stripped here and restored in `parseExternalReference`.
   */
  private buildExternalReference(
    sessionId: string | undefined,
    cartId: string | undefined
  ): string {
    const bareSessionId = (sessionId ?? crypto.randomUUID()).replace(/^payses_/, "")
    const bareCartId = (cartId ?? "").replace(/^cart_/, "")
    return `${bareSessionId}${EXTERNAL_REF_SEPARATOR}${bareCartId}`
  }

  private parseExternalReference(ref: string | undefined): {
    sessionId?: string
    cartId?: string
  } {
    if (!ref) return {}
    const [bareSessionId, bareCartId] = ref.split(EXTERNAL_REF_SEPARATOR)
    return {
      sessionId: bareSessionId ? `payses_${bareSessionId}` : undefined,
      cartId: bareCartId ? `cart_${bareCartId}` : undefined,
    }
  }

  /**
   * Common fields for every `POST /v1/orders` call. `X-Idempotency-Key` (the
   * Medusa session id) makes a retried request for the same session reuse
   * the same order instead of creating (and, for card, charging) a second
   * one.
   */
  private async createMpOrder<T>(
    input: InitiatePaymentInput,
    payment: Record<string, unknown>,
    payer: Record<string, unknown>
  ): Promise<T> {
    const sessionId = this.medusaSessionId(input)
    const cartId = (input.data as any)?.cart_id as string | undefined
    const totalAmount = (Number(input.amount) / 100).toFixed(2)

    return mpRequest<T>("/v1/orders", {
      method: "POST",
      accessToken: this.options_.accessToken || "",
      headers: {
        "X-Idempotency-Key": sessionId ?? crypto.randomUUID(),
      },
      body: JSON.stringify({
        type: "online",
        external_reference: this.buildExternalReference(sessionId, cartId),
        total_amount: totalAmount,
        processing_mode: "automatic",
        transactions: { payments: [{ amount: totalAmount, ...payment }] },
        payer,
      }),
    })
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    if (this.options_.method === "pix") {
      const payerCpf = (input.data as any)?.payer_cpf
      if (!payerCpf) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "CPF obrigatório para pix"
        )
      }

      const response = await this.createMpOrder<MpOrderResponse>(
        input,
        { payment_method: { id: "pix", type: "bank_transfer" } },
        {
          email: input.context?.customer?.email || "guest@checkout.local",
          identification: { type: "CPF", number: payerCpf },
        }
      )
      const payment = response.transactions.payments[0]

      return {
        id: `mercadopago_pix_${payment.id}`,
        data: {
          id: `mercadopago_pix_${payment.id}`,
          mp_payment_id: payment.id,
          mp_order_id: response.id,
          cart_id: (input.data as any)?.cart_id,
          provider_method: "pix",
          qr_code_emv: payment.payment_method?.qr_code,
          qr_code_base64: payment.payment_method?.qr_code_base64,
          expires_at: payment.date_of_expiration,
          status: this.mapMpStatus(payment.status),
          sandbox: this.isSandbox(),
        },
      }
    }

    if (this.options_.method === "boleto") {
      const payerCpf = (input.data as any)?.payer_cpf
      const firstName = (input.data as any)?.payer_first_name
      const lastName = (input.data as any)?.payer_last_name
      const address = (input.data as any)?.payer_address

      if (!payerCpf || !firstName || !lastName || !address) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "CPF, nome e endereço do titular são obrigatórios para boleto"
        )
      }

      const response = await this.createMpOrder<MpOrderResponse>(
        input,
        { payment_method: { id: "boleto", type: "ticket" } },
        {
          email: input.context?.customer?.email || "guest@checkout.local",
          first_name: firstName,
          last_name: lastName,
          identification: { type: "CPF", number: payerCpf },
          address,
        }
      )
      const payment = response.transactions.payments[0]

      return {
        id: `mercadopago_boleto_${payment.id}`,
        data: {
          id: `mercadopago_boleto_${payment.id}`,
          mp_payment_id: payment.id,
          mp_order_id: response.id,
          cart_id: (input.data as any)?.cart_id,
          provider_method: "boleto",
          linha_digitavel: payment.payment_method?.digitable_line,
          due_date: payment.date_of_expiration,
          status: this.mapMpStatus(payment.status),
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

      let response: MpOrderResponse
      try {
        response = await this.createMpOrder<MpOrderResponse>(
          input,
          {
            payment_method: {
              id: paymentMethodId,
              type: "credit_card",
              token,
              installments,
            },
          },
          { email: input.context?.customer?.email || "guest@checkout.local" }
        )
      } catch (err) {
        // A declined card comes back from Mercado Pago as a non-2xx (HTTP
        // 402, "Order was created but some transaction failed"), not a
        // `status: "rejected"` field in a 200 response like the legacy
        // Payments API. Any failure creating the card order is a decline:
        // block the order instead of leaking a generic INVALID_DATA error.
        throw new MedusaError(
          MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          err instanceof Error ? err.message : "Pagamento recusado"
        )
      }

      const payment = response.transactions.payments[0]
      if (payment.status !== "processed" || payment.status_detail !== "accredited") {
        throw new MedusaError(
          MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          payment.status_detail || "Pagamento recusado"
        )
      }

      return {
        id: `mercadopago_card_${payment.id}`,
        data: {
          id: `mercadopago_card_${payment.id}`,
          mp_payment_id: payment.id,
          mp_order_id: response.id,
          cart_id: (input.data as any)?.cart_id,
          provider_method: "card",
          max_installments: 12,
          status: this.mapMpStatus(payment.status),
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
   * Voids the Mercado Pago order behind this session for real. Mercado Pago
   * only allows `/cancel` on `created`/`action_required` orders, so an
   * already-processed order (e.g. a card charged synchronously in
   * `initiatePayment`) is fully refunded instead. The live MP status is
   * fetched first rather than trusting the possibly-stale status stored in
   * the session data.
   */
  async cancelPayment(input: any) {
    const data = await this.voidMpOrder(
      input.data,
      input.context?.idempotency_key
    )
    return { data }
  }

  /**
   * Called when Medusa deletes a payment session (e.g. the storefront retries
   * checkout, which replaces the cart's session with a new one). A deleted
   * session never becomes an order, so its Mercado Pago order is voided —
   * otherwise a retried card checkout would leave the first charge in place.
   * Sessions that were already authorized into a Medusa Payment are never
   * voided here; those go through `cancelPayment`/`refundPayment` explicitly.
   */
  async deletePayment(input: any) {
    if (input.data?.medusa_authorized) {
      return { data: { ...input.data } }
    }
    const data = await this.voidMpOrder(input.data, undefined)
    return { data }
  }

  async refundPayment(input: any) {
    const orderId = input.data?.mp_order_id
    const paymentId = input.data?.mp_payment_id

    if (!orderId || !paymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mercado Pago: pedido sem mp_order_id/mp_payment_id, não é possível estornar"
      )
    }

    // Medusa amounts in this store are in cents; Mercado Pago wants reais.
    const amountCents = new BigNumber(input.amount).numeric
    const refund = await mpRequest<{
      id: string
      transactions?: { refunds?: { id: string }[] }
    }>(`/v1/orders/${orderId}/refund`, {
      method: "POST",
      accessToken: this.options_.accessToken || "",
      headers: {
        "X-Idempotency-Key":
          input.context?.idempotency_key ?? crypto.randomUUID(),
      },
      body: JSON.stringify({
        transactions: [
          { id: paymentId, amount: (Math.round(amountCents) / 100).toFixed(2) },
        ],
      }),
    })

    const refundId = refund.transactions?.refunds?.[0]?.id ?? refund.id

    return {
      data: {
        ...input.data,
        mp_refund_ids: [...(input.data?.mp_refund_ids ?? []), refundId],
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
    // `payload.data`. Mercado Pago's Orders API webhook body is
    // `{ type: "order", action: "order.processed", data: { id: <ORDER id> } }`
    // — the order id (prefixed `ORD`), not a payment id.
    const body = (payload.data || {}) as any
    const headers = (payload.headers || {}) as Record<string, string>

    const topic = body.type ?? body.topic
    if (topic !== "order") {
      return { action: "not_supported" }
    }

    const orderId = body.data?.id
    if (orderId === undefined || orderId === null || orderId === "") {
      return { action: "not_supported" }
    }

    // Mercado Pago signs `id:<data.id>;...` and documents that alphanumeric
    // ids must be lowercased in the manifest.
    const dataId = String(orderId).toLowerCase()

    const signatureOk = this.verifySignature({
      xSignature: headers["x-signature"],
      xRequestId: headers["x-request-id"],
      dataId,
    })

    if (!signatureOk) {
      return { action: "not_supported" }
    }

    const response = await mpRequest<MpOrderResponse>(
      `/v1/orders/${encodeURIComponent(String(orderId))}`,
      { method: "GET", accessToken: this.options_.accessToken || "" }
    )

    const { sessionId, cartId } = this.parseExternalReference(
      response.external_reference
    )
    if (!sessionId) {
      // Not an order created by this integration (or created before
      // external_reference carried it) — there is no Medusa session to act on.
      return { action: "not_supported" }
    }

    const payment = response.transactions?.payments?.[0]
    const mappedStatus = this.mapMpStatus(response.status)

    if (
      payment?.payment_method?.id === "pix" &&
      mappedStatus === "captured" &&
      cartId
    ) {
      // The storefront success page listens on `/pix-status/:cart_id`.
      pixStatusEmitter.emit(cartId, { status: "paid" })
    }

    return {
      action: mappedStatus,
      data: {
        session_id: sessionId,
        // Mercado Pago reports reais; Medusa amounts in this store are cents.
        amount: Math.round(Number(response.total_amount) * 100),
      },
    }
  }

  /**
   * Cancels (pending) or fully refunds (already processed) the Mercado Pago
   * order referenced by `data.mp_order_id`. No-op when there is no MP order
   * yet or it is already in a terminal non-paid state.
   */
  private async voidMpOrder(
    data: Record<string, any> | undefined,
    idempotencyKey: string | undefined
  ): Promise<Record<string, any>> {
    const orderId = data?.mp_order_id
    if (!orderId) {
      return { ...(data ?? {}) }
    }

    const accessToken = this.options_.accessToken || ""
    const current = await mpRequest<{ id: string; status: string }>(
      `/v1/orders/${orderId}`,
      { method: "GET", accessToken }
    )

    if (MP_CANCELABLE_ORDER_STATUSES.includes(current.status)) {
      await mpRequest(`/v1/orders/${orderId}/cancel`, {
        method: "POST",
        accessToken,
        headers: {
          "X-Idempotency-Key": idempotencyKey ?? `cancel_${orderId}`,
        },
      })
      return { ...data, status: "canceled" }
    }

    if (current.status === "processed") {
      await mpRequest(`/v1/orders/${orderId}/refund`, {
        method: "POST",
        accessToken,
        headers: {
          "X-Idempotency-Key": idempotencyKey ?? `void_refund_${orderId}`,
        },
        body: JSON.stringify({
          transactions: data?.mp_payment_id
            ? [{ id: data.mp_payment_id }]
            : [],
        }),
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
    if (mpStatus === "processed") {
      return "captured"
    }
    if (
      mpStatus === "action_required" ||
      mpStatus === "processing" ||
      mpStatus === "created"
    ) {
      return "pending"
    }
    return "canceled"
  }
}

export default MercadoPagoBrService
