// client.unit.spec.ts
import { mpRequest } from "../client"

describe("mpRequest", () => {
  afterEach(() => jest.restoreAllMocks())

  it("sends a bearer token and parses JSON on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 1, status: "approved" }) }) as any
    const result = await mpRequest<{ id: number; status: string }>("/v1/payments", { method: "POST", accessToken: "TOKEN", body: JSON.stringify({}) })
    expect(result.status).toBe("approved")
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toBe("Bearer TOKEN")
  })

  it("throws a MedusaError with the MP error message on a non-2xx response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: "invalid card" }) }) as any
    await expect(mpRequest("/v1/payments", { method: "POST", accessToken: "TOKEN" })).rejects.toThrow("invalid card")
  })
})
