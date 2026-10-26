// service.pix.unit.spec.ts
import crypto from "crypto"
import MercadoPagoBrService from "../service"
import * as client from "../client"
import { pixStatusEmitter } from "../../../api/pix-status/[order_id]/emitter"

jest.mock("../client")

const SECRET = "whsec_test"

function makeService(method: "pix" = "pix") {
  return new MercadoPagoBrService({} as any, {
    accessToken: "TOKEN",
    mode: "live",
    method,
    webhookSecret: SECRET,
  })
}

/**
 * A webhook exactly as Medusa's `/hooks/payment/:provider` route hands it to
 * the provider: `data` is Mercado Pago's raw POST body, whose top-level `id`
 * is the NOTIFICATION id and whose nested `data.id` is the PAYMENT id. The
 * x-signature is a real HMAC over the payment id, as Mercado Pago computes it.
 */
function realisticWebhook(paymentId: string, opts: { notificationId?: number; type?: string; signWith?: string } = {}) {
  const ts = "1704908010"
  const requestId = "req-abc"
  const manifest = `id:${opts.signWith ?? paymentId};request-id:${requestId};ts:${ts};`
  const v1 = crypto.createHmac("sha256", SECRET).update(manifest).digest("hex")
  return {
    data: {
      id: opts.notificationId ?? 12345,
      live_mode: true,
      type: opts.type ?? "payment",
      action: "payment.updated",
      api_version: "v1",
      data: { id: paymentId },
    },
    rawData: Buffer.from(""),
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
  }
}

describe("MercadoPagoBrService — pix", () => {
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => jest.restoreAllMocks())

  it("initiatePayment creates a pix payment and maps the qr code fields", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 555,
      status: "pending",
      date_of_expiration: "2026-10-27T00:00:00Z",
      point_of_interaction: { transaction_data: { qr_code: "000201...", qr_code_base64: "base64==" } },
    })
    const svc = makeService()
    const result = await svc.initiatePayment({ amount: 1000, currency_code: "brl", data: { cart_id: "cart_1" } } as any)
    expect(result.data!.qr_code_emv).toBe("000201...")
    expect(result.data!.qr_code_base64).toBe("base64==")
    expect(result.data!.status).toBe("pending")
    expect(result.data!.mp_payment_id).toBe(555)
  })

  it("initiatePayment sends the real Medusa session id + cart id as MP metadata and as the idempotency key", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 555,
      status: "pending",
      date_of_expiration: "2026-10-27T00:00:00Z",
      point_of_interaction: { transaction_data: { qr_code: "q", qr_code_base64: "b" } },
    })
    const svc = makeService()
    // Shape Medusa's PaymentModuleService.createPaymentSession actually passes.
    await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: { cart_id: "cart_1", session_id: "payses_01REAL" },
      context: { idempotency_key: "payses_01REAL" },
    } as any)

    const [path, options] = (client.mpRequest as jest.Mock).mock.calls[0]
    expect(path).toBe("/v1/payments")
    const body = JSON.parse(options.body)
    expect(body.metadata).toEqual({ medusa_session_id: "payses_01REAL", cart_id: "cart_1" })
    expect(options.headers["X-Idempotency-Key"]).toBe("payses_01REAL")
  })

  it("getWebhookActionAndData rejects a payload with a bad signature without calling the API", async () => {
    const svc = makeService()
    const result = await svc.getWebhookActionAndData({
      data: { id: 12345, type: "payment", data: { id: "555" } },
      rawData: Buffer.from(""),
      headers: { "x-signature": "ts=1,v1=bad", "x-request-id": "r1" },
    } as any)
    expect(result.action).toBe("not_supported")
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("verifies the signature and fetches the payment using the NESTED data.id, not the notification id", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 555,
      status: "approved",
      payment_method_id: "pix",
      transaction_amount: 10,
      metadata: { medusa_session_id: "payses_01REAL", cart_id: "cart_1" },
    })
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("555", { notificationId: 98765 }) as any)

    expect(result.action).toBe("captured")
    expect(client.mpRequest).toHaveBeenCalledTimes(1)
    expect((client.mpRequest as jest.Mock).mock.calls[0][0]).toBe("/v1/payments/555")
  })

  it("rejects a signature computed over the top-level notification id", async () => {
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(
      realisticWebhook("555", { notificationId: 98765, signWith: "98765" }) as any
    )
    expect(result.action).toBe("not_supported")
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("returns not_supported early for a non-payment topic without calling the API", async () => {
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("555", { type: "merchant_order" }) as any)
    expect(result.action).toBe("not_supported")
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("returns the REAL Medusa session id from MP metadata and the amount in cents", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 555,
      status: "approved",
      payment_method_id: "pix",
      transaction_amount: 129.9,
      metadata: { medusa_session_id: "payses_01REAL", cart_id: "cart_1" },
    })
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("555") as any)
    expect(result.data!.session_id).toBe("payses_01REAL")
    expect(result.data!.amount).toBe(12990)
  })

  it("works identically for a boleto/card payment received on the pix-registered instance", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 777,
      status: "approved",
      payment_method_id: "bolbradesco",
      transaction_amount: 10,
      metadata: { medusa_session_id: "payses_BOLETO", cart_id: "cart_2" },
    })
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("777") as any)
    expect(result.action).toBe("captured")
    expect(result.data!.session_id).toBe("payses_BOLETO")
  })

  it("returns not_supported (no session_id) for an MP payment without medusa_session_id metadata", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 888,
      status: "approved",
      payment_method_id: "master",
      transaction_amount: 10,
      metadata: {},
    })
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("888") as any)
    expect(result.action).toBe("not_supported")
    expect(result.data).toBeUndefined()
  })

  it("emits the pix 'paid' SSE event on the cart id key the storefront listens on", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 555,
      status: "approved",
      payment_method_id: "pix",
      transaction_amount: 10,
      metadata: { medusa_session_id: "payses_01REAL", cart_id: "cart_1" },
    })
    const listener = jest.fn()
    pixStatusEmitter.once("cart_1", listener)
    const svc = makeService()
    await svc.getWebhookActionAndData(realisticWebhook("555") as any)
    expect(listener).toHaveBeenCalledWith({ status: "paid" })
  })

  it("maps a pending pix to the 'pending' action (ignored by Medusa's webhook subscriber)", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 555,
      status: "pending",
      payment_method_id: "pix",
      transaction_amount: 10,
      metadata: { medusa_session_id: "payses_01REAL", cart_id: "cart_1" },
    })
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("555") as any)
    expect(result.action).toBe("pending")
  })
})
