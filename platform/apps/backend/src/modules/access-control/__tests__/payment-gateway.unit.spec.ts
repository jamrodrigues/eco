// payment-gateway.unit.spec.ts
describe("payment-gateway settings", () => {
  function fakeService() {
    const store: any = {}
    return {
      retrievePaymentGatewaySettings: jest.fn(async (id: string) => {
        if (!store[id]) throw new Error("not found")
        return store[id]
      }),
      createPaymentGatewaySettings: jest.fn(async (data: any) => { store[data.id] = data; return data }),
      updatePaymentGatewaySettings: jest.fn(async (data: any) => { store[data.id] = { ...store[data.id], ...data }; return store[data.id] }),
    }
  }

  it("creates a default 'mercadopago' row the first time it's read", async () => {
    const svc = fakeService()
    const { getPaymentGatewaySettings } = require("../payment-gateway")
    const settings = await getPaymentGatewaySettings(svc)
    expect(settings.active_gateway).toBe("mercadopago")
  })

  it("updates the existing row instead of creating a second one", async () => {
    const svc = fakeService()
    const { getPaymentGatewaySettings, updatePaymentGatewaySettings } = require("../payment-gateway")
    await getPaymentGatewaySettings(svc)
    await updatePaymentGatewaySettings(svc, { active_gateway: "pagarme" })
    const settings = await getPaymentGatewaySettings(svc)
    expect(settings.active_gateway).toBe("pagarme")
    expect(svc.createPaymentGatewaySettings).toHaveBeenCalledTimes(1)
  })

  it("never lets extra fields (id, deleted_at) reach the update call", async () => {
    const svc = fakeService()
    const { updatePaymentGatewaySettings } = require("../payment-gateway")
    await updatePaymentGatewaySettings(svc, {
      active_gateway: "pagarme",
      id: "other_row",
      deleted_at: new Date(),
    } as any)
    expect(svc.updatePaymentGatewaySettings).toHaveBeenCalledWith({
      id: "default",
      active_gateway: "pagarme",
    })
  })
})
