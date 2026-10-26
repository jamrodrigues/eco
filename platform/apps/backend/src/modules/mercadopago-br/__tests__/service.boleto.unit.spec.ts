// service.boleto.unit.spec.ts
import MercadoPagoBrService from "../service"
import * as client from "../client"
jest.mock("../client")

function makeService() {
  return new MercadoPagoBrService({} as any, { accessToken: "TOKEN", mode: "live", method: "boleto" })
}

describe("MercadoPagoBrService — boleto", () => {
  afterEach(() => jest.restoreAllMocks())

  it("throws when payer_cpf is missing", async () => {
    const svc = makeService()
    await expect(svc.initiatePayment({ amount: 1000, currency_code: "brl", data: {} } as any)).rejects.toThrow(/CPF/)
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("maps a created boleto to linha_digitavel + due date", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: 777,
      status: "pending",
      date_of_expiration: "2026-10-30T00:00:00Z",
      transaction_details: { external_resource_url: "https://mp/boleto/777", barcode: { content: "341912345..." } },
    })
    const svc = makeService()
    const result = await svc.initiatePayment({ amount: 1000, currency_code: "brl", data: { payer_cpf: "11111111111" } } as any)
    expect(result.data.linha_digitavel).toBe("341912345...")
    expect(result.data.due_date).toBe("2026-10-30T00:00:00Z")
  })
})
