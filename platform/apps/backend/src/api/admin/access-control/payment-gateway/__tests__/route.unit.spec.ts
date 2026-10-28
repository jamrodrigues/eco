import { PUT } from "../route"
import { updatePaymentGatewaySettings } from "../../../../../modules/access-control/payment-gateway"

jest.mock("../../../../../modules/access-control", () => ({
  ACCESS_CONTROL_MODULE: "access_control",
}))
jest.mock("../../../../../modules/access-control/payment-gateway", () => ({
  getPaymentGatewaySettings: jest.fn(),
  updatePaymentGatewaySettings: jest.fn(),
}))

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

function mockReq(body: any) {
  return {
    body,
    scope: { resolve: jest.fn().mockReturnValue({}) },
  } as any
}

describe("PUT /admin/access-control/payment-gateway", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(updatePaymentGatewaySettings as jest.Mock).mockResolvedValue({
      id: "default",
      active_gateway: "pagarme",
    })
  })

  it("passes a valid active_gateway through to the helper", async () => {
    const res = mockRes()
    await PUT(mockReq({ active_gateway: "pagarme" }), res)

    expect(updatePaymentGatewaySettings).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.status).not.toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      settings: { id: "default", active_gateway: "pagarme" },
    })
  })

  it("rejects an invalid active_gateway with 400 and never calls the helper", async () => {
    const res = mockRes()
    await PUT(mockReq({ active_gateway: "stripe" }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "active_gateway must be 'mercadopago' or 'pagarme'",
    })
    expect(updatePaymentGatewaySettings).not.toHaveBeenCalled()
  })

  it("only forwards active_gateway — never an admin-supplied id or deleted_at", async () => {
    const res = mockRes()
    await PUT(
      mockReq({ active_gateway: "pagarme", id: "other_row", deleted_at: "2026-01-01" }),
      res
    )

    expect(updatePaymentGatewaySettings).toHaveBeenCalledWith(expect.anything(), {
      active_gateway: "pagarme",
    })
  })

  it("passes through when active_gateway is absent (no 400)", async () => {
    const res = mockRes()
    await PUT(mockReq({}), res)

    expect(updatePaymentGatewaySettings).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalledWith(400)
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
