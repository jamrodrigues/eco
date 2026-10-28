// service.card.unit.spec.ts
import MercadoPagoBrService from "../service"
import * as client from "../client"
import { MedusaError } from "@medusajs/framework/utils"
jest.mock("../client")

function makeService() {
  return new MercadoPagoBrService({} as any, { accessToken: "TOKEN", mode: "live", method: "card" })
}

function calls() {
  return (client.mpRequest as jest.Mock).mock.calls
}

function approvedOrderResponse(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: "ORD999",
    status: "processed",
    status_detail: "accredited",
    external_reference: "x__y",
    total_amount: "10.00",
    transactions: {
      payments: [
        {
          id: "PAY999",
          amount: "10.00",
          status: "processed",
          status_detail: "accredited",
          payment_method: { id: "master", type: "credit_card" },
        },
      ],
    },
    ...overrides,
  }
}

describe("MercadoPagoBrService — card", () => {
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => jest.restoreAllMocks())

  it("throws INVALID_DATA when payment_method_id is missing", async () => {
    const svc = makeService()
    await expect(
      svc.initiatePayment({
        amount: 1000,
        currency_code: "brl",
        data: { token: "tok_abc", installments: 1 },
      } as any)
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("throws PAYMENT_AUTHORIZATION_ERROR when the order comes back with a non-accredited payment", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(
      approvedOrderResponse({
        status: "action_required",
        status_detail: "pending_challenge",
        transactions: {
          payments: [
            {
              id: "PAY999",
              amount: "10.00",
              status: "action_required",
              status_detail: "cc_rejected_insufficient_amount",
              payment_method: { id: "master", type: "credit_card" },
            },
          ],
        },
      })
    )
    const svc = makeService()
    await expect(
      svc.initiatePayment({
        amount: 1000,
        currency_code: "brl",
        data: { token: "tok_abc", installments: 1, payment_method_id: "master" },
      } as any)
    ).rejects.toMatchObject({ type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR })
  })

  it("throws PAYMENT_AUTHORIZATION_ERROR when Mercado Pago rejects the order outright (non-2xx, declined test card)", async () => {
    ;(client.mpRequest as jest.Mock).mockRejectedValue(
      new MedusaError(MedusaError.Types.INVALID_DATA, "Unauthorized use of live credentials")
    )
    const svc = makeService()
    await expect(
      svc.initiatePayment({
        amount: 1000,
        currency_code: "brl",
        data: { token: "tok_abc", installments: 1, payment_method_id: "master" },
      } as any)
    ).rejects.toMatchObject({ type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR })
  })

  it("returns status 'captured' when MP approves the card charge, sending payment_method_id to MP", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(approvedOrderResponse())
    const svc = makeService()
    const result = await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: { token: "tok_abc", installments: 3, payment_method_id: "master" },
    } as any)
    expect(result.data!.status).toBe("captured")
    expect(result.data!.mp_payment_id).toBe("PAY999")
    expect(result.data!.mp_order_id).toBe("ORD999")

    const [, options] = calls()[calls().length - 1]
    const body = JSON.parse(options.body)
    const paymentMethod = body.transactions.payments[0].payment_method
    expect(paymentMethod.id).toBe("master")
    expect(paymentMethod.token).toBe("tok_abc")
    expect(paymentMethod.installments).toBe(3)
  })

  it("posts to /v1/orders with the real Medusa session id as X-Idempotency-Key and external_reference", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue(approvedOrderResponse())
    const svc = makeService()
    await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: { token: "tok_abc", installments: 1, payment_method_id: "visa", session_id: "payses_CARD", cart_id: "cart_9" },
      context: { idempotency_key: "payses_CARD" },
    } as any)
    const [path, options] = calls()[0]
    expect(path).toBe("/v1/orders")
    expect(options.headers["X-Idempotency-Key"]).toBe("payses_CARD")
    expect(JSON.parse(options.body).external_reference).toBe("CARD__9")
  })

  describe("refundPayment", () => {
    it("POSTs a refund to MP's order endpoint in reais with Medusa's idempotency key", async () => {
      ;(client.mpRequest as jest.Mock).mockResolvedValue({
        id: "ORD999",
        status: "processed",
        transactions: { refunds: [{ id: "REF1" }] },
      })
      const svc = makeService()
      const result = await svc.refundPayment({
        amount: { value: "2550", precision: 20 },
        data: { mp_order_id: "ORD999", mp_payment_id: "PAY999" },
        context: { idempotency_key: "ref_01" },
      } as any)

      const [path, options] = calls()[0]
      expect(path).toBe("/v1/orders/ORD999/refund")
      expect(options.method).toBe("POST")
      expect(options.headers["X-Idempotency-Key"]).toBe("ref_01")
      expect(JSON.parse(options.body)).toEqual({
        transactions: [{ id: "PAY999", amount: "25.50" }],
      })
      expect(result.data!.mp_refund_ids).toEqual(["REF1"])
    })

    it("throws instead of faking success when there is no MP order id", async () => {
      const svc = makeService()
      await expect(svc.refundPayment({ amount: 100, data: {} } as any)).rejects.toThrow()
      expect(client.mpRequest).not.toHaveBeenCalled()
    })

    it("propagates an MP failure instead of reporting a refund", async () => {
      ;(client.mpRequest as jest.Mock).mockRejectedValue(new Error("Mercado Pago request failed"))
      const svc = makeService()
      await expect(
        svc.refundPayment({ amount: 100, data: { mp_order_id: "ORD999", mp_payment_id: "PAY999" } } as any)
      ).rejects.toThrow("Mercado Pago request failed")
    })
  })

  describe("cancelPayment", () => {
    it("POSTs /cancel to MP for an action_required order", async () => {
      ;(client.mpRequest as jest.Mock)
        .mockResolvedValueOnce({ id: "ORD999", status: "action_required" })
        .mockResolvedValueOnce({ id: "ORD999", status: "canceled" })
      const svc = makeService()
      const result = await svc.cancelPayment({
        data: { mp_order_id: "ORD999" },
        context: { idempotency_key: "pay_01" },
      } as any)

      expect(calls()[0][0]).toBe("/v1/orders/ORD999")
      expect(calls()[0][1].method).toBe("GET")
      const [path, options] = calls()[1]
      expect(path).toBe("/v1/orders/ORD999/cancel")
      expect(options.method).toBe("POST")
      expect(options.headers["X-Idempotency-Key"]).toBe("pay_01")
      expect(result.data!.status).toBe("canceled")
    })

    it("fully refunds an already-processed order (MP cannot cancel processed orders)", async () => {
      ;(client.mpRequest as jest.Mock)
        .mockResolvedValueOnce({ id: "ORD999", status: "processed" })
        .mockResolvedValueOnce({ id: "ORD999", status: "processed" })
      const svc = makeService()
      await svc.cancelPayment({ data: { mp_order_id: "ORD999", mp_payment_id: "PAY999" } } as any)
      const [path, options] = calls()[1]
      expect(path).toBe("/v1/orders/ORD999/refund")
      expect(options.method).toBe("POST")
      expect(JSON.parse(options.body)).toEqual({ transactions: [{ id: "PAY999" }] })
    })

    it("does not call MP mutations for an already-canceled order", async () => {
      ;(client.mpRequest as jest.Mock).mockResolvedValueOnce({ id: "ORD999", status: "canceled" })
      const svc = makeService()
      await svc.cancelPayment({ data: { mp_order_id: "ORD999" } } as any)
      expect(calls()).toHaveLength(1)
    })

    it("propagates an MP failure instead of reporting a cancellation", async () => {
      ;(client.mpRequest as jest.Mock)
        .mockResolvedValueOnce({ id: "ORD999", status: "action_required" })
        .mockRejectedValueOnce(new Error("Mercado Pago request failed"))
      const svc = makeService()
      await expect(svc.cancelPayment({ data: { mp_order_id: "ORD999" } } as any)).rejects.toThrow()
    })
  })

  describe("authorizePayment", () => {
    it("reports captured when the card was already charged synchronously", async () => {
      const svc = makeService()
      const result = await svc.authorizePayment({
        data: { mp_order_id: "ORD999", status: "captured" },
      } as any)
      expect(result.status).toBe("captured")
      expect(result.data.medusa_authorized).toBe(true)
    })

    it("falls back to authorized when the session has no captured status", async () => {
      const svc = makeService()
      const result = await svc.authorizePayment({
        data: { mp_order_id: "ORD999", status: "pending" },
      } as any)
      expect(result.status).toBe("authorized")
    })
  })

  describe("deletePayment", () => {
    it("voids the MP order of an abandoned (never authorized) session", async () => {
      ;(client.mpRequest as jest.Mock)
        .mockResolvedValueOnce({ id: "ORD999", status: "processed" })
        .mockResolvedValueOnce({ id: "ORD999", status: "processed" })
      const svc = makeService()
      await svc.deletePayment({ data: { mp_order_id: "ORD999", mp_payment_id: "PAY999" } } as any)
      expect(calls()[1][0]).toBe("/v1/orders/ORD999/refund")
    })

    it("never voids a session that was already authorized into a Medusa payment", async () => {
      const svc = makeService()
      const authorized = await svc.authorizePayment({ data: { mp_order_id: "ORD999" } })
      await svc.deletePayment({ data: authorized.data } as any)
      expect(client.mpRequest).not.toHaveBeenCalled()
    })

    it("is a no-op when MP never created an order for the session", async () => {
      const svc = makeService()
      await svc.deletePayment({ data: { cart_id: "c" } } as any)
      expect(client.mpRequest).not.toHaveBeenCalled()
    })
  })
})
