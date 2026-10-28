// signature.unit.spec.ts
import crypto from "crypto"
import { verifyMpSignature } from "../signature"

function sign(manifest: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(manifest).digest("hex")
}

describe("verifyMpSignature", () => {
  const secret = "test-secret"
  const dataId = "123456789"
  const requestId = "req-abc"
  const ts = "1700000000"
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const validSig = `ts=${ts},v1=${sign(manifest, secret)}`

  it("accepts a correctly-signed header", () => {
    expect(verifyMpSignature({ xSignature: validSig, xRequestId: requestId, dataId, secret })).toBe(true)
  })

  it("rejects a tampered signature", () => {
    expect(verifyMpSignature({ xSignature: `ts=${ts},v1=deadbeef`, xRequestId: requestId, dataId, secret })).toBe(false)
  })

  it("rejects a missing header", () => {
    expect(verifyMpSignature({ xSignature: undefined, xRequestId: requestId, dataId, secret })).toBe(false)
  })
})
