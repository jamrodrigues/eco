import crypto from "crypto"

/**
 * Verifies a Mercado Pago webhook's `x-signature` header.
 *
 * Mercado Pago sends `x-signature: ts=<unix_ts>,v1=<hex_hmac>`. The signed
 * manifest is the literal string `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`,
 * and `v1` is HMAC-SHA256(manifest, secret) hex-encoded.
 *
 * This is the security boundary for the whole module: a forged or malformed
 * webhook must never be trusted, and this function must never throw — any
 * invalid/missing input simply returns `false`.
 */
export function verifyMpSignature(args: {
  xSignature: string | undefined
  xRequestId: string | undefined
  dataId: string
  secret: string
}): boolean {
  try {
    const { xSignature, xRequestId, dataId, secret } = args

    if (!xSignature || typeof xSignature !== "string") {
      return false
    }

    let ts: string | undefined
    let v1: string | undefined

    for (const part of xSignature.split(",")) {
      const [rawKey, ...rawRest] = part.split("=")
      const key = rawKey?.trim()
      const value = rawRest.join("=").trim()
      if (key === "ts") {
        ts = value
      } else if (key === "v1") {
        v1 = value
      }
    }

    if (!ts || !v1) {
      return false
    }

    const manifest = `id:${dataId};request-id:${xRequestId ?? ""};ts:${ts};`
    const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

    const expectedBuf = Buffer.from(expected, "hex")
    const actualBuf = Buffer.from(v1, "hex")

    if (expectedBuf.length !== actualBuf.length || expectedBuf.length === 0) {
      return false
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf)
  } catch {
    return false
  }
}
