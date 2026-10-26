// service.pix.unit.spec.ts
import MercadoPagoBrService from "../service"
import * as client from "../client"

jest.mock("../client")

function makeService(method: "pix" = "pix") {
  return new MercadoPagoBrService({} as any, { accessToken: "TOKEN", mode: "live", method })
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
    expect(result.data.qr_code_emv).toBe("000201...")
    expect(result.data.qr_code_base64).toBe("base64==")
    expect(result.data.status).toBe("pending")
    expect(result.data.mp_payment_id).toBe(555)
  })

  it("getWebhookActionAndData rejects a payload with a bad signature without calling the API", async () => {
    const svc = makeService()
    const result = await svc.getWebhookActionAndData({
      data: { id: "555", type: "payment" },
      rawData: Buffer.from(""),
      headers: { "x-signature": "ts=1,v1=bad", "x-request-id": "r1" },
    } as any)
    expect(result.action).toBe("not_supported")
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("getWebhookActionAndData maps an approved payment to 'captured'", async () => {
    const svcAny = makeService() as any
    jest.spyOn(svcAny, "verifySignature" as any).mockReturnValue(true)
    ;(client.mpRequest as jest.Mock).mockResolvedValue({ id: 555, status: "approved", transaction_amount: 10, metadata: { cart_id: "cart_1" } })
    const result = await svcAny.getWebhookActionAndData({ data: { id: "555" }, rawData: Buffer.from(""), headers: {} })
    expect(result.action).toBe("captured")
  })
})
