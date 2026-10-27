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
 * the provider: `data` is Mercado Pago's raw POST body for the Orders API,
 * whose `data.id` is the ORDER id (prefixed `ORD`). The x-signature is a
 * real HMAC over that order id, as Mercado Pago computes it.
 */
function realisticWebhook(orderId: string, opts: { type?: string; signWith?: string } = {}) {
  const ts = "1704908010"
  const requestId = "req-abc"
  const manifest = `id:${(opts.signWith ?? orderId).toLowerCase()};request-id:${requestId};ts:${ts};`
  const v1 = crypto.createHmac("sha256", SECRET).update(manifest).digest("hex")
  return {
    data: {
      type: opts.type ?? "order",
      action: "order.processed",
      api_version: "v1",
      data: { id: orderId },
    },
    rawData: Buffer.from(""),
    headers: { "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": requestId },
  }
}

function mpOrderResponse(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: "ORD555",
    status: "action_required",
    status_detail: "waiting_transfer",
    external_reference: "01REAL__1",
    total_amount: "10.00",
    transactions: {
      payments: [
        {
          id: "PAY555",
          amount: "10.00",
          status: "action_required",
          status_detail: "waiting_transfer",
          date_of_expiration: "2026-10-27T00:00:00Z",
          payment_method: {
            id: "pix",
            type: "bank_transfer",
            qr_code: "000201...",
            qr_code_base64: "base64==",
          },
        },
      ],
    },
    ...overrides,
  }
}

describe("MercadoPagoBrService — pix", () => {
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => jest.restoreAllMocks())

  it("throws when payer_cpf is missing", async () => {
    const svc = makeService()
    await expect(
      svc.initiatePayment({ amount: 1000, currency_code: "brl", data: { cart_id: "cart_1" } } as any)
    ).rejects.toThrow(/CPF/)
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("initiatePayment creates a pix order and maps the qr code fields", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(mpOrderResponse())
    const svc = makeService()
    const result = await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: { cart_id: "cart_1", payer_cpf: "11111111111" },
    } as any)
    expect(result.data!.qr_code_emv).toBe("000201...")
    expect(result.data!.qr_code_base64).toBe("base64==")
    expect(result.data!.status).toBe("pending")
    expect(result.data!.mp_payment_id).toBe("PAY555")
    expect(result.data!.mp_order_id).toBe("ORD555")
  })

  it("initiatePayment posts to /v1/orders with the real Medusa session+cart id in external_reference and as the idempotency key", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(mpOrderResponse())
    const svc = makeService()
    // Shape Medusa's PaymentModuleService.createPaymentSession actually passes.
    await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: { cart_id: "cart_1", session_id: "payses_01REAL", payer_cpf: "11111111111" },
      context: { idempotency_key: "payses_01REAL" },
    } as any)

    const [path, options] = (client.mpRequest as jest.Mock).mock.calls[0]
    expect(path).toBe("/v1/orders")
    const body = JSON.parse(options.body)
    expect(body.external_reference).toBe("01REAL__1")
    expect(body.transactions.payments[0].payment_method).toEqual({ id: "pix", type: "bank_transfer" })
    expect(body.payer.identification).toEqual({ type: "CPF", number: "11111111111" })
    expect(options.headers["X-Idempotency-Key"]).toBe("payses_01REAL")
  })

  it("getWebhookActionAndData rejects a payload with a bad signature without calling the API", async () => {
    const svc = makeService()
    const result = await svc.getWebhookActionAndData({
      data: { type: "order", data: { id: "ORD555" } },
      rawData: Buffer.from(""),
      headers: { "x-signature": "ts=1,v1=bad", "x-request-id": "r1" },
    } as any)
    expect(result.action).toBe("not_supported")
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("verifies the signature and fetches the order using data.id", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(
      mpOrderResponse({ status: "processed", status_detail: "accredited" })
    )
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("ORD555") as any)

    expect(result.action).toBe("captured")
    expect(client.mpRequest).toHaveBeenCalledTimes(1)
    expect((client.mpRequest as jest.Mock).mock.calls[0][0]).toBe("/v1/orders/ORD555")
  })

  it("rejects a signature computed over a different id", async () => {
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(
      realisticWebhook("ORD555", { signWith: "ORD999" }) as any
    )
    expect(result.action).toBe("not_supported")
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("returns not_supported early for a non-order topic without calling the API", async () => {
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("ORD555", { type: "payment" }) as any)
    expect(result.action).toBe("not_supported")
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("returns the REAL Medusa session id from external_reference and the amount in cents", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(
      mpOrderResponse({
        status: "processed",
        status_detail: "accredited",
        total_amount: "129.90",
        external_reference: "01REAL__1",
      })
    )
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("ORD555") as any)
    expect(result.data!.session_id).toBe("payses_01REAL")
    expect(result.data!.amount).toBe(12990)
  })

  it("works identically for a boleto/card order received on the pix-registered instance", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(
      mpOrderResponse({
        id: "ORD777",
        status: "processed",
        status_detail: "accredited",
        external_reference: "BOLETO__2",
        transactions: {
          payments: [
            {
              id: "PAY777",
              amount: "10.00",
              status: "processed",
              status_detail: "accredited",
              payment_method: { id: "bolbradesco", type: "ticket" },
            },
          ],
        },
      })
    )
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("ORD777") as any)
    expect(result.action).toBe("captured")
    expect(result.data!.session_id).toBe("payses_BOLETO")
  })

  it("returns not_supported (no session_id) for an order without a parseable external_reference", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(
      mpOrderResponse({ id: "ORD888", external_reference: undefined })
    )
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("ORD888") as any)
    expect(result.action).toBe("not_supported")
    expect(result.data).toBeUndefined()
  })

  it("emits the pix 'paid' SSE event on the cart id key the storefront listens on", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(
      mpOrderResponse({ status: "processed", status_detail: "accredited" })
    )
    const listener = jest.fn()
    pixStatusEmitter.once("cart_1", listener)
    const svc = makeService()
    await svc.getWebhookActionAndData(realisticWebhook("ORD555") as any)
    expect(listener).toHaveBeenCalledWith({ status: "paid" })
  })

  it("maps a pending pix order to the 'pending' action (ignored by Medusa's webhook subscriber)", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(mpOrderResponse())
    const svc = makeService()
    const result = await svc.getWebhookActionAndData(realisticWebhook("ORD555") as any)
    expect(result.action).toBe("pending")
  })
})
