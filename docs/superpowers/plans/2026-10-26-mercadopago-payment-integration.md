# Mercado Pago Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mercado Pago (real API, pix/card/boleto) the primary payment gateway, keep Pagar.me as a stub secondary, and let an admin switch which one is active via a settings toggle that takes effect on the next checkout.

**Architecture:** A new `mercadopago-br` Medusa payment-provider module (same `AbstractPaymentProvider` shape as the existing `pagarme-br` stub) calls the real Mercado Pago REST API directly with native `fetch` (no new npm dependency — Node 22 has global `fetch`, matching the zero-SDK style of `pagarme-br`). A new singleton setting (`payment_gateway_settings`, in the existing `access-control` module, same pattern as `maintenance_settings`) holds `active_gateway`. The storefront reads that setting right before creating a payment session and picks the matching `provider_id`. Pix/boleto are async (Mercado Pago's own webhook, via Medusa's built-in `/hooks/payment/:provider_id` route, drives the real capture). Card is synchronous (charged inside `initiatePayment`, so a decline blocks the order before it's ever created).

**Tech Stack:** Medusa v2 (`@medusajs/framework` 2.21.2), TypeScript, Jest (`test:unit`, see `jest.config.js` — files at `src/**/__tests__/**/*.unit.spec.ts`), Next.js storefront, native `fetch`.

**Spec:** `docs/superpowers/specs/2026-10-26-mercadopago-payment-integration-design.md`

## Global Constraints

- Mercado Pago is the primary gateway; Pagar.me stays a stub (no changes to `pagarme-br`).
- Toggle is one global switch (`mercadopago` | `pagarme`), not per payment method.
- Toggle only affects checkouts started after the switch — no invalidation of in-flight payment sessions.
- Never send raw card number/CVV to the backend — only the Mercado Pago SDK token.
- Never trust the webhook body without re-fetching the payment from the Mercado Pago API first.
- `provider_id` naming follows the existing scheme: `pp_mercadopago-br_pix_br`, `pp_mercadopago-br_card_br`, `pp_mercadopago-br_boleto_br`.
- Medusa's built-in webhook route is **per registered provider instance** (`POST /hooks/payment/:provider` resolves the exact provider id `pp_{provider}` — confirmed in `@medusajs/payment/dist/services/payment-module.js:696`), but Mercado Pago only lets you configure **one** webhook URL for the whole integration, shared across pix/card/boleto. So `getWebhookActionAndData` must not depend on which of the 3 registered instances receives the call — it re-derives the payment method from the Mercado Pago API response itself (`payment_method_id`), not from `this.options_.method`. Register Mercado Pago's single webhook URL as `{BACKEND_URL}/hooks/payment/mercadopago-br_pix_br` (the pix instance is picked arbitrarily — card/boleto webhooks arrive on the same URL and are handled identically).
- Credentials (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`, `MP_MODE`) are supplied by the user as env vars outside this plan — code must read them from `process.env`/module options, never hardcode them.

## Review Focus

- **Card declined by Mercado Pago at checkout** — must block `completeCart`/order creation and show the customer an error, not silently complete the order (Task 8, Task 11).
- **Webhook request with a missing or invalid `x-signature`** — must be rejected (treated as `not_supported`/ignored) before ever calling the Mercado Pago API or touching order state, since an unverified webhook is attacker-controlled input (Task 6).
- **Mercado Pago retries the same webhook delivery** (it does, on any non-2xx or timeout) — processing it twice must not error or double-capture (Task 6).
- **Boleto requested without a CPF on the cart** — Mercado Pago's API hard-requires `payer.identification` for `bolbradesco`; must fail with a clear "CPF obrigatório" error instead of a raw 400 from Mercado Pago (Task 7).
- **Gateway toggled while a customer already has a cart with a payment session on the old gateway** — that session must still complete normally; only sessions created after the switch use the new gateway (Task 10).

---

## File Structure

**Backend — gateway settings (`access-control` module, mirrors `maintenance_settings`):**
- Create: `platform/apps/backend/src/modules/access-control/models/payment-gateway-settings.ts`
- Modify: `platform/apps/backend/src/modules/access-control/service.ts` (register the model)
- Create: `platform/apps/backend/src/modules/access-control/payment-gateway.ts` (get/update helpers)
- Create: `platform/apps/backend/src/modules/access-control/migrations/Migration<generated>.ts` (via CLI)
- Modify: `platform/apps/backend/src/modules/access-control/permissions.ts` (new `payment_gateway` category)
- Create: `platform/apps/backend/src/api/admin/access-control/payment-gateway/route.ts`
- Create: `platform/apps/backend/src/api/store/payment-gateway-status/route.ts`
- Modify: `platform/apps/backend/src/admin/routes/access-control/page.tsx` (toggle UI)

**Backend — Mercado Pago provider:**
- Create: `platform/apps/backend/src/modules/mercadopago-br/client.ts`
- Create: `platform/apps/backend/src/modules/mercadopago-br/signature.ts`
- Create: `platform/apps/backend/src/modules/mercadopago-br/service.ts`
- Create: `platform/apps/backend/src/modules/mercadopago-br/index.ts`
- Modify: `platform/apps/backend/medusa-config.ts` (register the 3 providers)
- Modify: `platform/apps/backend/.env.template` (new MP_* vars)
- Tests: `platform/apps/backend/src/modules/mercadopago-br/__tests__/*.unit.spec.ts`
- Tests: `platform/apps/backend/src/modules/access-control/__tests__/payment-gateway.unit.spec.ts`

**Storefront:**
- Modify: `platform/apps/storefront/src/lib/cart.ts` (dynamic provider id, cart_id passthrough)
- Modify: `platform/apps/storefront/app/checkout/page.tsx` (resolve gateway, card form, decline UX)

---

### Task 1: `payment_gateway_settings` model, service, migration, helpers

**Files:**
- Create: `platform/apps/backend/src/modules/access-control/models/payment-gateway-settings.ts`
- Modify: `platform/apps/backend/src/modules/access-control/service.ts`
- Create: `platform/apps/backend/src/modules/access-control/payment-gateway.ts`
- Create: `platform/apps/backend/src/modules/access-control/migrations/Migration<generated>.ts`
- Test: `platform/apps/backend/src/modules/access-control/__tests__/payment-gateway.unit.spec.ts`

**Interfaces:**
- Produces: `getPaymentGatewaySettings(accessControlService): Promise<{ id: string; active_gateway: "mercadopago" | "pagarme" }>` and `updatePaymentGatewaySettings(accessControlService, data: { active_gateway?: "mercadopago" | "pagarme" }): Promise<{ id: string; active_gateway: string }>` — used by Task 2's admin route and Task 3's store route.

- [ ] **Step 1: Write the failing unit test**

```ts
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd platform/apps/backend && npm run test:unit -- payment-gateway.unit.spec.ts`
Expected: FAIL (`../payment-gateway` has no exports / module not found)

- [ ] **Step 3: Define the model in `payment-gateway-settings.ts`**

Single-row model, same shape as `maintenance-settings.ts`:
```ts
const PaymentGatewaySettings = model.define("payment_gateway_settings", {
  id: model.id().primaryKey(),
  active_gateway: model.text().default("mercadopago"),
})
```
Register it in `access-control/service.ts`'s `MedusaService({ ... })` call alongside `MaintenanceSettings`.

- [ ] **Step 4: Implement the helpers in `payment-gateway.ts`**

Exact signatures (mirror `maintenance.ts`'s `DEFAULT_ID = "default"` pattern):
```ts
export async function getPaymentGatewaySettings(accessControlService: any): Promise<{ id: string; active_gateway: "mercadopago" | "pagarme" }>
export async function updatePaymentGatewaySettings(accessControlService: any, data: { active_gateway?: "mercadopago" | "pagarme" }): Promise<{ id: string; active_gateway: string }>
```
`getPaymentGatewaySettings` must try `retrievePaymentGatewaySettings(DEFAULT_ID)` and fall back to creating it with `active_gateway: "mercadopago"` on failure, exactly like `getMaintenanceSettings` does.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd platform/apps/backend && npm run test:unit -- payment-gateway.unit.spec.ts`
Expected: PASS

- [ ] **Step 6: Generate and commit the migration**

Run: `cd platform/apps/backend && npx medusa db:generate access-control`
Verify the generated migration's SQL creates `payment_gateway_settings` with columns `id`, `active_gateway` (default `'mercadopago'`), `created_at`, `updated_at`, `deleted_at` — same column style as the `maintenance_settings` table in `Migration20261018183318.ts`.

- [ ] **Step 7: Commit**

```bash
git add platform/apps/backend/src/modules/access-control
git commit -m "feat(backend): add payment_gateway_settings singleton"
```

---

### Task 2: Admin API route + permission category for the gateway toggle

**Files:**
- Create: `platform/apps/backend/src/api/admin/access-control/payment-gateway/route.ts`
- Modify: `platform/apps/backend/src/modules/access-control/permissions.ts`

**Interfaces:**
- Consumes: `getPaymentGatewaySettings`/`updatePaymentGatewaySettings` from Task 1 (`../../../../modules/access-control/payment-gateway`).
- Produces: `GET /admin/access-control/payment-gateway` → `{ settings: { active_gateway } }`; `PUT` with body `{ active_gateway: "mercadopago" | "pagarme" }` → same shape. Permission category `"payment_gateway"` added to `PermissionCategory`, `ALL_TRUE`, and every entry in `ROLE_DEFINITIONS` (`true` only for `super_admin`, `false` everywhere else — same tier as `maintenance_mode`). `PREFIX_MAP` gets `["/admin/access-control/payment-gateway", "payment_gateway"]`.

- [ ] **Step 1: Add `payment_gateway` to the permission types and role matrix**

In `permissions.ts`: add `"payment_gateway"` to the `PermissionCategory` union; add `payment_gateway: true` to `ALL_TRUE`; add `payment_gateway: false` to the `gerente` override block (next to `maintenance_mode: false`) and to the `operador_pdv` and `atendimento_marketing` literal maps; add `["/admin/access-control/payment-gateway", "payment_gateway"]` to `PREFIX_MAP`.

- [ ] **Step 2: Write the route (no new test — mirrors the already-covered `maintenance/route.ts` pattern 1:1, business logic is Task 1's, already tested)**

```ts
// route.ts
export async function GET(req: MedusaRequest, res: MedusaResponse) { /* resolve ACCESS_CONTROL_MODULE, getPaymentGatewaySettings, res.json({ settings }) */ }
type Body = { active_gateway?: "mercadopago" | "pagarme" }
export async function PUT(req: MedusaRequest<Body>, res: MedusaResponse) { /* updatePaymentGatewaySettings(svc, req.body), res.json({ settings }) */ }
```

- [ ] **Step 3: Manually verify the permission wiring**

Run: `cd platform/apps/backend && npm run dev`, then as a logged-in admin: `curl -b <admin session cookie> http://localhost:9000/admin/access-control/payment-gateway` → expect `200` with `{"settings":{"id":"default","active_gateway":"mercadopago"}}` on first call.
Expected: 200, default row returned.

- [ ] **Step 4: Commit**

```bash
git add platform/apps/backend/src/api/admin/access-control/payment-gateway platform/apps/backend/src/modules/access-control/permissions.ts
git commit -m "feat(backend): admin route + permission for payment gateway toggle"
```

---

### Task 3: Public store endpoint for the active gateway

**Files:**
- Create: `platform/apps/backend/src/api/store/payment-gateway-status/route.ts`

**Interfaces:**
- Consumes: `getPaymentGatewaySettings` from Task 1.
- Produces: `GET /store/payment-gateway-status` (no auth) → `{ active_gateway: "mercadopago" | "pagarme" }`. This is what Task 10's storefront code calls before creating a payment session.

- [ ] **Step 1: Write the route**

Mirror `store/maintenance-status/route.ts` exactly:
```ts
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const accessControlService: any = req.scope.resolve(ACCESS_CONTROL_MODULE)
  const settings = await getPaymentGatewaySettings(accessControlService)
  res.status(200).json({ active_gateway: settings.active_gateway })
}
```

- [ ] **Step 2: Verify manually**

Run: `cd platform/apps/backend && npm run dev`, then `curl http://localhost:9000/store/payment-gateway-status -H "x-publishable-api-key: <key>"`
Expected: `200 {"active_gateway":"mercadopago"}`

- [ ] **Step 3: Commit**

```bash
git add platform/apps/backend/src/api/store/payment-gateway-status
git commit -m "feat(backend): public endpoint for active payment gateway"
```

---

### Task 4: Admin UI — gateway toggle section

**Files:**
- Modify: `platform/apps/backend/src/admin/routes/access-control/page.tsx`

**Interfaces:**
- Consumes: `GET`/`PUT /admin/access-control/payment-gateway` from Task 2; `me.permissions.payment_gateway` from `/admin/access-control/me` (already returns the full `PermissionMap`, no backend change needed).

- [ ] **Step 1: Add state and load logic**

Add `const [gateway, setGateway] = useState<{ active_gateway: string } | null>(null)` and a `savingGateway` boolean, same shape as `maintenance`/`savingMaintenance`. In `load()`, under `if (meResult.permissions.payment_gateway === true)`, fetch `/admin/access-control/payment-gateway` and `setGateway(settings)`.

- [ ] **Step 2: Add `switchGateway(next: "mercadopago" | "pagarme")`**

```ts
async function switchGateway(next: "mercadopago" | "pagarme") {
  if (!gateway || gateway.active_gateway === next) return
  setSavingGateway(true)
  try {
    const { settings } = await adminFetch<{ settings: { active_gateway: string } }>(
      "/admin/access-control/payment-gateway",
      { method: "PUT", body: JSON.stringify({ active_gateway: next }) }
    )
    setGateway(settings)
  } catch (err: any) {
    setError(err.message)
  } finally {
    setSavingGateway(false)
  }
}
```

- [ ] **Step 3: Render the section**

Add a `"Gateway de Pagamento"` section (same `style={{ marginBottom: 32 }}` block pattern as "Modo Manutenção", gated by `me?.permissions.payment_gateway === true`) with two buttons, "Mercado Pago" and "Pagar.me", the active one highlighted (reuse the green/red button style already used for the maintenance toggle), calling `switchGateway("mercadopago")` / `switchGateway("pagarme")`.

- [ ] **Step 4: Manually verify in the browser**

Run: `cd platform/apps/backend && npm run dev`, open `/app/access-control`, confirm the section renders for a `super_admin`, clicking the other option flips it and `GET /admin/access-control/payment-gateway` reflects the change after reload.

- [ ] **Step 5: Commit**

```bash
git add platform/apps/backend/src/admin/routes/access-control/page.tsx
git commit -m "feat(backend): admin toggle UI for payment gateway"
```

---

### Task 5: Mercado Pago API client + webhook signature verification

**Files:**
- Create: `platform/apps/backend/src/modules/mercadopago-br/client.ts`
- Create: `platform/apps/backend/src/modules/mercadopago-br/signature.ts`
- Test: `platform/apps/backend/src/modules/mercadopago-br/__tests__/signature.unit.spec.ts`
- Test: `platform/apps/backend/src/modules/mercadopago-br/__tests__/client.unit.spec.ts`

**Interfaces:**
- Produces: `verifyMpSignature(args: { xSignature: string | undefined; xRequestId: string | undefined; dataId: string; secret: string }): boolean` and `mpRequest<T>(path: string, init: RequestInit & { accessToken: string }): Promise<T>` — both consumed by Task 6's `service.ts`.

- [ ] **Step 1: Write the failing signature test**

Per Mercado Pago's documented webhook signature scheme: the `x-signature` header is `ts=<unix_ts>,v1=<hex_hmac>`; the signed manifest is the literal string `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`; `v1` is `HMAC-SHA256(manifest, secret)` hex-encoded.

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd platform/apps/backend && npm run test:unit -- signature.unit.spec.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `verifyMpSignature` in `signature.ts`**

Parse `ts=` and `v1=` out of the comma-separated `xSignature` header, rebuild the manifest string exactly as in the test, HMAC it with `secret`, and compare to `v1` using `crypto.timingSafeEqual` (constant-time — this guards a financial webhook). Return `false` (never throw) for any malformed/missing input.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd platform/apps/backend && npm run test:unit -- signature.unit.spec.ts`
Expected: PASS

- [ ] **Step 5: Write the failing client test**

```ts
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd platform/apps/backend && npm run test:unit -- client.unit.spec.ts`
Expected: FAIL (module not found)

- [ ] **Step 7: Implement `mpRequest` in `client.ts`**

```ts
export async function mpRequest<T>(path: string, init: RequestInit & { accessToken: string }): Promise<T>
```
Base URL `https://api.mercadopago.com`; merge `Authorization: Bearer ${accessToken}` and `Content-Type: application/json` into headers; on `!response.ok`, throw `new MedusaError(MedusaError.Types.INVALID_DATA, body.message || "Mercado Pago request failed")` using the parsed JSON body's `message` field (Mercado Pago's documented error shape).

- [ ] **Step 8: Run test to verify it passes**

Run: `cd platform/apps/backend && npm run test:unit -- client.unit.spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add platform/apps/backend/src/modules/mercadopago-br/client.ts platform/apps/backend/src/modules/mercadopago-br/signature.ts platform/apps/backend/src/modules/mercadopago-br/__tests__
git commit -m "feat(backend): mercadopago-br API client and webhook signature check"
```

---

### Task 6: `MercadoPagoBrService` — pix method + webhook-driven capture

**Files:**
- Create: `platform/apps/backend/src/modules/mercadopago-br/service.ts`
- Create: `platform/apps/backend/src/modules/mercadopago-br/index.ts`
- Modify: `platform/apps/backend/medusa-config.ts`
- Modify: `platform/apps/backend/.env.template`
- Test: `platform/apps/backend/src/modules/mercadopago-br/__tests__/service.pix.unit.spec.ts`

**Interfaces:**
- Consumes: `mpRequest`, `verifyMpSignature` from Task 5.
- Produces: `MercadoPagoBrService` (`static identifier = "mercadopago-br"`), options type `MercadoPagoBrOptions = { accessToken?: string; publicKey?: string; webhookSecret?: string; mode?: "sandbox" | "live"; method: "pix" | "card" | "boleto" }`. Task 7 and Task 8 add the `boleto`/`card` branches to `initiatePayment` on the same class (branching on `this.options_.method`). `getWebhookActionAndData`, by contrast, does **not** branch on `this.options_.method` — see the note in Step 5 and in Global Constraints.

- [ ] **Step 1: Write the failing pix test**

```ts
// service.pix.unit.spec.ts
import MercadoPagoBrService from "../service"
import * as client from "../client"

jest.mock("../client")

function makeService(method: "pix" = "pix") {
  return new MercadoPagoBrService({} as any, { accessToken: "TOKEN", mode: "live", method })
}

describe("MercadoPagoBrService — pix", () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd platform/apps/backend && npm run test:unit -- service.pix.unit.spec.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement the pix branch of `initiatePayment`**

`POST /v1/payments` via `mpRequest` with `transaction_amount: Number(input.amount) / 100`, `payment_method_id: "pix"`, `payer: { email: input.context?.customer?.email || "guest@checkout.local" }`, `description: "Pedido loja"`. Map the response to:
```ts
{ id: `mercadopago_pix_${response.id}`, data: { id: `mercadopago_pix_${response.id}`, mp_payment_id: response.id, cart_id: (input.data as any)?.cart_id, provider_method: "pix", qr_code_emv: response.point_of_interaction.transaction_data.qr_code, qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64, expires_at: response.date_of_expiration, status: mapMpStatus(response.status), sandbox: this.isSandbox() } }
```
Write the private `mapMpStatus(mpStatus: string): "pending" | "captured" | "canceled"` helper: `"approved"` → `"captured"`, `"pending" | "in_process"` → `"pending"`, anything else → `"canceled"`.

- [ ] **Step 4: Implement `authorizePayment`/`capturePayment`/`cancelPayment`/`refundPayment`/`retrievePayment`/`updatePayment`/`getPaymentStatus`**

Pass-through on `input.data` exactly like `PagarmeBrService` does (no extra API calls — the pix payment's real status transition happens via the webhook, not these). `getPaymentStatus` returns `{ status: input.data?.status || "pending" }`.

- [ ] **Step 5: Implement `getWebhookActionAndData`**

```ts
async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult>
```
This method's behavior must be **identical regardless of which of the 3 registered instances (`pix_br`/`card_br`/`boleto_br`) receives the call** (see Global Constraints — Mercado Pago only calls one shared webhook URL). Do not branch on `this.options_.method` here.

Read `x-signature`/`x-request-id` from `payload.headers`, call `verifyMpSignature({ xSignature, xRequestId, dataId: String(data.id), secret: this.options_.webhookSecret || "" })`; on `false`, return `{ action: "not_supported" }` immediately (Review Focus: no API call on bad signature). On `true`, call `mpRequest(`/v1/payments/${data.id}`, { method: "GET", accessToken })`. Derive which method actually created the session from the response's own `payment_method_id` (`"pix"` → `"pix"`, `"bolbradesco"` → `"boleto"`, anything else → `"card"`) and reconstruct `session_id` as `mercadopago_${derivedMethod}_${response.id}` (must match the exact `id` format `initiatePayment` used in Steps 3/Task 7/Task 8). Map `response.status` with the same `mapMpStatus` helper from Step 3. Emit the pix SSE ping only when `derivedMethod === "pix"` and the mapped status is `"captured"`: `import { pixStatusEmitter } from "../../api/pix-status/[order_id]/emitter"` then `pixStatusEmitter.emit(response.metadata?.cart_id ?? String(data.id), { status: "paid" })`. Return `{ action: <mapped status translated to "captured"/"pending"/"canceled">, data: { session_id, amount: response.transaction_amount } }`.

Note on Review Focus (webhook replay): this method only reads and reports status — it never writes application state itself, so Medusa's own capture workflow (triggered by the `"captured"` action) is what must be idempotent, and it already is (capturing an already-captured payment is a no-op in Medusa core). No extra code needed here, but call this out in the PR description so the reviewer checks it.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd platform/apps/backend && npm run test:unit -- service.pix.unit.spec.ts`
Expected: PASS

- [ ] **Step 7: Create `index.ts` and register in `medusa-config.ts`**

```ts
// index.ts
export default ModuleProvider(Modules.PAYMENT, { services: [MercadoPagoBrService] })
```
In `medusa-config.ts`, add three entries to the existing payment module's `providers` array (next to the `pagarme-br` ones), resolve `"./src/modules/mercadopago-br"`, ids `"pix_br"` / `"card_br"` / `"boleto_br"`, options `{ accessToken: process.env.MP_ACCESS_TOKEN, publicKey: process.env.MP_PUBLIC_KEY, webhookSecret: process.env.MP_WEBHOOK_SECRET, mode: process.env.MP_MODE, method: "pix" | "card" | "boleto" }`.

- [ ] **Step 8: Add env vars to `.env.template`**

Add `MP_ACCESS_TOKEN=`, `MP_PUBLIC_KEY=`, `MP_WEBHOOK_SECRET=`, `MP_MODE=sandbox` (blank values — the user supplies real ones outside this plan).

- [ ] **Step 9: Commit**

```bash
git add platform/apps/backend/src/modules/mercadopago-br platform/apps/backend/medusa-config.ts platform/apps/backend/.env.template
git commit -m "feat(backend): mercadopago-br provider — pix method + webhook capture"
```

---

### Task 7: `MercadoPagoBrService` — boleto method

**Files:**
- Modify: `platform/apps/backend/src/modules/mercadopago-br/service.ts`
- Test: `platform/apps/backend/src/modules/mercadopago-br/__tests__/service.boleto.unit.spec.ts`

**Interfaces:**
- Consumes: `mapMpStatus`, `mpRequest` from Task 6 (same file/class, private helpers reused directly).
- Produces: `initiatePayment` throws `MedusaError(MedusaError.Types.INVALID_DATA, "CPF obrigatório para boleto")` when `input.data?.payer_cpf` is missing — this is the exact field name Task 11 (storefront) must send.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd platform/apps/backend && npm run test:unit -- service.boleto.unit.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement the boleto branch of `initiatePayment`**

Guard first: if `!(input.data as any)?.payer_cpf`, throw `MedusaError.Types.INVALID_DATA` with message `"CPF obrigatório para boleto"` — no API call. Otherwise `POST /v1/payments` with `payment_method_id: "bolbradesco"`, `payer: { email: ..., identification: { type: "CPF", number: input.data.payer_cpf } }`. Map response to `{ id: \`mercadopago_boleto_${response.id}\`, data: { ..., provider_method: "boleto", linha_digitavel: response.transaction_details.barcode.content, due_date: response.date_of_expiration, status: mapMpStatus(response.status), sandbox: this.isSandbox() } }` (same shape `pagarme-br`'s boleto branch already produces, so the success page needs no changes).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd platform/apps/backend && npm run test:unit -- service.boleto.unit.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add platform/apps/backend/src/modules/mercadopago-br/service.ts platform/apps/backend/src/modules/mercadopago-br/__tests__/service.boleto.unit.spec.ts
git commit -m "feat(backend): mercadopago-br provider — boleto method"
```

---

### Task 8: `MercadoPagoBrService` — card method (sync charge + decline)

**Files:**
- Modify: `platform/apps/backend/src/modules/mercadopago-br/service.ts`
- Test: `platform/apps/backend/src/modules/mercadopago-br/__tests__/service.card.unit.spec.ts`

**Interfaces:**
- Consumes: same class/helpers as Task 6/7.
- Produces: `initiatePayment` for `method: "card"` requires `input.data.token` and `input.data.installments` (exact field names Task 11 must send); on an MP `"rejected"` response it throws `MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR, ...)` — this is the exact error type Task 11's checkout page must catch to show the decline message.

- [ ] **Step 1: Write the failing test**

```ts
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

  it("throws PAYMENT_AUTHORIZATION_ERROR when MP rejects the card", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({ id: 999, status: "rejected", status_detail: "cc_rejected_insufficient_amount" })
    const svc = makeService()
    await expect(
      svc.initiatePayment({ amount: 1000, currency_code: "brl", data: { token: "tok_abc", installments: 1 } } as any)
    ).rejects.toMatchObject({ type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR })
  })

  it("returns status 'captured' when MP approves the card charge", async () => {
    ;(client.mpRequest as jest.Mock).mockResolvedValue({ id: 999, status: "approved" })
    const svc = makeService()
    const result = await svc.initiatePayment({ amount: 1000, currency_code: "brl", data: { token: "tok_abc", installments: 3 } } as any)
    expect(result.data.status).toBe("captured")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd platform/apps/backend && npm run test:unit -- service.card.unit.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement the card branch of `initiatePayment`**

`POST /v1/payments` with `transaction_amount: Number(input.amount) / 100`, `token: input.data.token`, `installments: input.data.installments`, `payer: { email: ... }`. If `response.status === "rejected"`, throw `new MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR, response.status_detail || "Pagamento recusado")` (Review Focus: this throw happens inside `POST /store/payment-collections/:id/payment-sessions`, so the storefront's existing `createPaymentSession` call fails before `completeCart` is ever reached — no new blocking logic needed on the Medusa side). Otherwise map to `{ id: \`mercadopago_card_${response.id}\`, data: { ..., provider_method: "card", mp_payment_id: response.id, max_installments: 12, status: mapMpStatus(response.status), sandbox: this.isSandbox() } }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd platform/apps/backend && npm run test:unit -- service.card.unit.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add platform/apps/backend/src/modules/mercadopago-br/service.ts platform/apps/backend/src/modules/mercadopago-br/__tests__/service.card.unit.spec.ts
git commit -m "feat(backend): mercadopago-br provider — card method with decline handling"
```

---

### Task 9: Storefront — dynamic gateway + provider id resolution

**Files:**
- Modify: `platform/apps/storefront/src/lib/cart.ts`

**Interfaces:**
- Produces: `fetchActivePaymentGateway(): Promise<"mercadopago" | "pagarme">` (calls `GET /store/payment-gateway-status` from Task 3); `getPaymentProviderId(method: "pix" | "card" | "boleto"): Promise<string>`; `createPaymentSession(paymentCollectionId: string, providerId: string, data?: Record<string, unknown>)` (adds the optional `data` param Task 8/11 need to pass `token`/`installments`/`payer_cpf`/`cart_id` through).
- Consumes (Task 10): replaces the current `PAYMENT_PROVIDER_IDS` constant and the plain `method -> providerId` lookup in `checkout/page.tsx:237`.

- [ ] **Step 1: Replace `PAYMENT_PROVIDER_IDS` with a per-gateway map and the resolver**

```ts
const PAYMENT_PROVIDER_IDS_BY_GATEWAY = {
  mercadopago: { pix: "pp_mercadopago-br_pix_br", card: "pp_mercadopago-br_card_br", boleto: "pp_mercadopago-br_boleto_br" },
  pagarme: { pix: "pp_pagarme-br_pix_br", card: "pp_pagarme-br_card_br", boleto: "pp_pagarme-br_boleto_br" },
} as const

export async function fetchActivePaymentGateway(): Promise<"mercadopago" | "pagarme"> {
  const { active_gateway } = await fetchJson<{ active_gateway: "mercadopago" | "pagarme" }>("/store/payment-gateway-status")
  return active_gateway
}

export async function getPaymentProviderId(method: "pix" | "card" | "boleto"): Promise<string> {
  const gateway = await fetchActivePaymentGateway()
  return PAYMENT_PROVIDER_IDS_BY_GATEWAY[gateway][method]
}
```
Delete the old exported `PAYMENT_PROVIDER_IDS` constant — Task 11 switches its one caller to `getPaymentProviderId`.

- [ ] **Step 2: Add the optional `data` param to `createPaymentSession`**

Change the signature to `createPaymentSession(paymentCollectionId: string, providerId: string, data?: Record<string, unknown>)` and include `data` in the `JSON.stringify({ provider_id: providerId, data })` body when present.

- [ ] **Step 3: Manually verify**

Run: `cd platform/apps/storefront && npm run dev`, open the browser console on `/checkout`, run `await import("@/lib/cart").then(m => m.getPaymentProviderId("pix"))` — expect it to resolve to `"pp_mercadopago-br_pix_br"` while the toggle is on Mercado Pago (default).
Expected: resolves to the mercadopago id.

- [ ] **Step 4: Commit**

```bash
git add platform/apps/storefront/src/lib/cart.ts
git commit -m "feat(storefront): resolve payment provider id from the active gateway setting"
```

---

### Task 10: Storefront — checkout wiring (gateway + CPF for boleto)

**Files:**
- Modify: `platform/apps/storefront/app/checkout/page.tsx`

**Interfaces:**
- Consumes: `getPaymentProviderId`, `createPaymentSession(collId, providerId, data?)` from Task 9.

- [ ] **Step 1: Add a CPF field to the address state**

Add `cpf: ""` to the `address` state object and a corresponding input in the "Endereço de Entrega" card (same style as the existing inputs), required only when `method === "boleto"`.

- [ ] **Step 2: Replace the static lookup in `handlePlaceOrder`**

Change:
```ts
const session = await createPaymentSession(
  paymentCollection.id,
  PAYMENT_PROVIDER_IDS[method as keyof typeof PAYMENT_PROVIDER_IDS]
)
```
to:
```ts
const providerId = await getPaymentProviderId(method as "pix" | "card" | "boleto")
const sessionData =
  method === "boleto" ? { payer_cpf: address.cpf.replace(/\D/g, ""), cart_id: cart.id } :
  method === "pix" ? { cart_id: cart.id } :
  undefined // card: Task 11 fills this with { token, installments }
const session = await createPaymentSession(paymentCollection.id, providerId, sessionData)
```
Update the `method` typing/import since `PAYMENT_PROVIDER_IDS` no longer exists (remove it from the `@/lib/cart` import list).

- [ ] **Step 3: Verify the existing error path surfaces a decline**

No new code needed — `handlePlaceOrder`'s existing `catch (e)` already does `setError(e instanceof Error ? e.message : ...)`. Confirm by manual test once Task 11 adds a real card token: submit a Mercado Pago sandbox test card that the Mercado Pago docs mark as "always rejected" and check the red error text appears instead of navigating to the success page.

- [ ] **Step 4: Commit**

```bash
git add platform/apps/storefront/app/checkout/page.tsx
git commit -m "feat(storefront): wire checkout to the active gateway, add CPF for boleto"
```

---

### Task 11: Storefront — card form + Mercado Pago tokenization

**Files:**
- Modify: `platform/apps/storefront/app/checkout/page.tsx`

**Interfaces:**
- Consumes: `MP_PUBLIC_KEY` via `process.env.NEXT_PUBLIC_MP_PUBLIC_KEY` (new public env var — add it next to the other `NEXT_PUBLIC_*` vars at the top of the file); `createPaymentSession` from Task 9.

This task is deliberately left more open than the others: Mercado Pago's own client-side tokenization flow (`https://sdk.mercadopago.com/js/v2`, `new MercadoPago(publicKey)`, then either the low-level `createCardToken` or the higher-level "Payment Brick"/"Card Form" helper) determines the exact fields and the `payment_method_id` lookup — follow Mercado Pago's current official "Checkout API — Cartões" integration guide rather than guessing the SDK's method names here, since that's exactly the kind of detail that goes stale.

- [ ] **Step 1: Add the card number/expiry/CVV/holder-name form**

Only rendered when `method === "card"`, inside the existing "Forma de Pagamento" card, below the method buttons. Local state only (never sent to the backend as raw values).

- [ ] **Step 2: Load the Mercado Pago SDK and tokenize on submit**

Load `https://sdk.mercadopago.com/js/v2` (e.g. via a `<script>` tag or dynamic import, matching however other third-party scripts are loaded in this codebase — check `app/layout.tsx` for precedent before adding a new pattern). Before calling `createPaymentSession` for `method === "card"`, tokenize the form fields and set `sessionData = { token: <tokenization result's token id>, installments: <chosen installments, default 1> }`.

- [ ] **Step 3: Surface Mercado Pago's own client-side validation errors**

Invalid card number/expired date/etc. should show inline under the form field, before ever calling `createPaymentSession` — don't rely on the backend decline path for input mistakes the SDK already validates.

- [ ] **Step 4: Manual QA against Mercado Pago's sandbox test cards**

With `MP_MODE=sandbox` and real sandbox credentials, run through: (a) an approved test card → order completes, success page shows; (b) a test card documented as always-rejected → red error shown, no navigation, no order created (check the admin — no new order). Mercado Pago's current docs list the exact sandbox test card numbers; use whatever they currently publish.

- [ ] **Step 5: Commit**

```bash
git add platform/apps/storefront/app/checkout/page.tsx
git commit -m "feat(storefront): card payment form with Mercado Pago tokenization"
```
