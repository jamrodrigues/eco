// service.boleto.unit.spec.ts
import MercadoPagoBrService from "../service"
import * as client from "../client"
jest.mock("../client")

function makeService() {
  return new MercadoPagoBrService({} as any, { accessToken: "TOKEN", mode: "live", method: "boleto" })
}

const ADDRESS = {
  zip_code: "01310100",
  street_name: "Av. Paulista",
  street_number: "1000",
  neighborhood: "Bela Vista",
  state: "SP",
  city: "Sao Paulo",
}

describe("MercadoPagoBrService — boleto", () => {
  afterEach(() => jest.restoreAllMocks())

  it("throws when payer_cpf is missing", async () => {
    const svc = makeService()
    await expect(
      svc.initiatePayment({
        amount: 1000,
        currency_code: "brl",
        data: { payer_first_name: "A", payer_last_name: "B", payer_address: ADDRESS },
      } as any)
    ).rejects.toThrow(/CPF/)
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("throws when payer name/address is missing", async () => {
    const svc = makeService()
    await expect(
      svc.initiatePayment({
        amount: 1000,
        currency_code: "brl",
        data: { payer_cpf: "11111111111" },
      } as any)
    ).rejects.toThrow(/nome e endereço/)
    expect(client.mpRequest).not.toHaveBeenCalled()
  })

  it("maps a created boleto order to linha_digitavel + due date", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: "ORD777",
      status: "action_required",
      status_detail: "pending_waiting_payment",
      external_reference: "x__y",
      total_amount: "10.00",
      transactions: {
        payments: [
          {
            id: "PAY777",
            amount: "10.00",
            status: "action_required",
            status_detail: "pending_waiting_payment",
            date_of_expiration: "2026-10-30T00:00:00Z",
            payment_method: { id: "boleto", type: "ticket", digitable_line: "341912345..." },
          },
        ],
      },
    })
    const svc = makeService()
    const result = await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: {
        payer_cpf: "11111111111",
        payer_first_name: "Maria",
        payer_last_name: "Silva",
        payer_address: ADDRESS,
      },
    } as any)
    expect(result.data!.linha_digitavel).toBe("341912345...")
    expect(result.data!.due_date).toBe("2026-10-30T00:00:00Z")
    expect(result.data!.mp_payment_id).toBe("PAY777")
    expect(result.data!.mp_order_id).toBe("ORD777")
  })

  it("posts to /v1/orders with the real Medusa session+cart id in external_reference, idempotency key, and full payer", async () => {
    ;(client.mpRequest as jest.Mock).mockClear()
    ;(client.mpRequest as jest.Mock).mockResolvedValue({
      id: "ORD778",
      status: "action_required",
      external_reference: "BOL__b",
      total_amount: "10.00",
      transactions: {
        payments: [
          {
            id: "PAY778",
            amount: "10.00",
            status: "action_required",
            payment_method: { id: "boleto", type: "ticket", digitable_line: "b" },
          },
        ],
      },
    })
    const svc = makeService()
    await svc.initiatePayment({
      amount: 1000,
      currency_code: "brl",
      data: {
        payer_cpf: "11111111111",
        payer_first_name: "Maria",
        payer_last_name: "Silva",
        payer_address: ADDRESS,
        cart_id: "cart_b",
        session_id: "payses_BOL",
      },
      context: { idempotency_key: "payses_BOL" },
    } as any)
    const [path, options] = (client.mpRequest as jest.Mock).mock.calls[0]
    expect(path).toBe("/v1/orders")
    const body = JSON.parse(options.body)
    expect(body.external_reference).toBe("BOL__b")
    expect(body.payer.first_name).toBe("Maria")
    expect(body.payer.last_name).toBe("Silva")
    expect(body.payer.address).toEqual(ADDRESS)
    expect(options.headers["X-Idempotency-Key"]).toBe("payses_BOL")
  })
})
