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

  it("throws PAYMENT_AUTHORIZATION_ERROR when MP rejects the card", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({ id: 999, status: "rejected", status_detail: "cc_rejected_insufficient_amount" })
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
    ;(client.mpRequest as jest.Mock).mockResolvedValue({ id: 999, status: "approved" })
    const svc = makeService()
    const result = await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: { token: "tok_abc", installments: 3, payment_method_id: "master" },
    } as any)
    expect(result.data!.status).toBe("captured")

    const [, options] = calls()[calls().length - 1]
    const body = JSON.parse(options.body)
    expect(body.payment_method_id).toBe("master")
    expect(body.token).toBe("tok_abc")
    expect(body.installments).toBe(3)
  })

  it("charges with the real Medusa session id as X-Idempotency-Key and metadata", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({ id: 999, status: "approved" })
    const svc = makeService()
    await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: { token: "tok_abc", installments: 1, payment_method_id: "visa", session_id: "payses_CARD", cart_id: "cart_9" },
      context: { idempotency_key: "payses_CARD" },
    } as any)
    const [, options] = calls()[0]
    expect(options.headers["X-Idempotency-Key"]).toBe("payses_CARD")
    expect(JSON.parse(options.body).metadata).toEqual({ medusa_session_id: "payses_CARD", cart_id: "cart_9" })
  })

  describe("refundPayment", () => {
    it("POSTs a refund to MP in reais with Medusa's idempotency key", async () => {
      ;(client.mpRequest as jest.Mock).mockResolvedValue({ id: 4242, status: "approved" })
      const svc = makeService()
      const result = await svc.refundPayment({
        amount: { value: "2550", precision: 20 },
        data: { mp_payment_id: 999 },
        context: { idempotency_key: "ref_01" },
      } as any)

      const [path, options] = calls()[0]
      expect(path).toBe("/v1/payments/999/refunds")
      expect(options.method).toBe("POST")
      expect(options.headers["X-Idempotency-Key"]).toBe("ref_01")
      expect(JSON.parse(options.body)).toEqual({ amount: 25.5 })
      expect(result.data!.mp_refund_ids).toEqual([4242])
    })

    it("throws instead of faking success when there is no MP payment id", async () => {
      const svc = makeService()
      await expect(svc.refundPayment({ amount: 100, data: {} } as any)).rejects.toThrow()
      expect(client.mpRequest).not.toHaveBeenCalled()
    })

    it("propagates an MP failure instead of reporting a refund", async () => {
      ;(client.mpRequest as jest.Mock).mockRejectedValue(new Error("Mercado Pago request failed"))
      const svc = makeService()
      await expect(
        svc.refundPayment({ amount: 100, data: { mp_payment_id: 999 } } as any)
      ).rejects.toThrow("Mercado Pago request failed")
    })
  })

  describe("cancelPayment", () => {
    it("PUTs status 'canceled' to MP for a pending payment", async () => {
      ;(client.mpRequest as jest.Mock)
        .mockResolvedValueOnce({ id: 999, status: "pending" })
        .mockResolvedValueOnce({ id: 999, status: "canceled" })
      const svc = makeService()
      const result = await svc.cancelPayment({
        data: { mp_payment_id: 999 },
        context: { idempotency_key: "pay_01" },
      } as any)

      expect(calls()[0][0]).toBe("/v1/payments/999")
      expect(calls()[0][1].method).toBe("GET")
      const [path, options] = calls()[1]
      expect(path).toBe("/v1/payments/999")
      expect(options.method).toBe("PUT")
      expect(JSON.parse(options.body)).toEqual({ status: "cancelled" })
      expect(options.headers["X-Idempotency-Key"]).toBe("pay_01")
      expect(result.data!.status).toBe("canceled")
    })

    it("fully refunds an already-approved payment (MP cannot cancel approved payments)", async () => {
      ;(client.mpRequest as jest.Mock)
        .mockResolvedValueOnce({ id: 999, status: "approved" })
        .mockResolvedValueOnce({ id: 1, status: "approved" })
      const svc = makeService()
      await svc.cancelPayment({ data: { mp_payment_id: 999 } } as any)
      const [path, options] = calls()[1]
      expect(path).toBe("/v1/payments/999/refunds")
      expect(options.method).toBe("POST")
      expect(JSON.parse(options.body)).toEqual({})
    })

    it("does not call MP mutations for an already-cancelled payment", async () => {
      ;(client.mpRequest as jest.Mock).mockResolvedValueOnce({ id: 999, status: "cancelled" })
      const svc = makeService()
      await svc.cancelPayment({ data: { mp_payment_id: 999 } } as any)
      expect(calls()).toHaveLength(1)
    })

    it("propagates an MP failure instead of reporting a cancellation", async () => {
      ;(client.mpRequest as jest.Mock)
        .mockResolvedValueOnce({ id: 999, status: "pending" })
        .mockRejectedValueOnce(new Error("Mercado Pago request failed"))
      const svc = makeService()
      await expect(svc.cancelPayment({ data: { mp_payment_id: 999 } } as any)).rejects.toThrow()
    })
  })

  describe("deletePayment", () => {
    it("voids the MP charge of an abandoned (never authorized) session", async () => {
      ;(client.mpRequest as jest.Mock)
        .mockResolvedValueOnce({ id: 999, status: "approved" })
        .mockResolvedValueOnce({ id: 1, status: "approved" })
      const svc = makeService()
      await svc.deletePayment({ data: { mp_payment_id: 999 } } as any)
      expect(calls()[1][0]).toBe("/v1/payments/999/refunds")
    })

    it("never voids a session that was already authorized into a Medusa payment", async () => {
      const svc = makeService()
      const authorized = await svc.authorizePayment({ data: { mp_payment_id: 999 } })
      await svc.deletePayment({ data: authorized.data } as any)
      expect(client.mpRequest).not.toHaveBeenCalled()
    })

    it("is a no-op when MP never created a payment for the session", async () => {
      const svc = makeService()
      await svc.deletePayment({ data: { cart_id: "c" } } as any)
      expect(client.mpRequest).not.toHaveBeenCalled()
    })
  })
})
