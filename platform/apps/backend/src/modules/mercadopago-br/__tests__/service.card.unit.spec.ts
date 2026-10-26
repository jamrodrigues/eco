// service.card.unit.spec.ts
import MercadoPagoBrService from "../service"
import * as client from "../client"
import { MedusaError } from "@medusajs/framework/utils"
jest.mock("../client")

function makeService() {
  return new MercadoPagoBrService({} as any, { accessToken: "TOKEN", mode: "live", method: "card" })
}

describe("MercadoPagoBrService — card", () => {
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
    expect(result.data.status).toBe("captured")

    const calls = (client.mpRequest as jest.Mock).mock.calls
    const [, options] = calls[calls.length - 1]
    const body = JSON.parse(options.body)
    expect(body.payment_method_id).toBe("master")
    expect(body.token).toBe("tok_abc")
    expect(body.installments).toBe(3)
  })
})
