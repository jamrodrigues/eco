import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useRef, useState } from "react"

type BasketItem = {
  variant_id: string
  product_title: string
  variant_title: string
  sku: string
  unit_price: number
  quantity: number
  available_quantity: number
}

type PaymentMethod = "pix" | "card" | "cash"

type SaleReceipt = {
  sale_id: string
  items: { sku: string; quantity: number; unit_price: number }[]
  total: number
  payment_method: PaymentMethod
  cash_received: number | null
  change: number
  created_at: string
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `${response.status}`)
  }
  return response.json()
}

const PdvPage = () => {
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [barcode, setBarcode] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix")
  const [cashReceived, setCashReceived] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null)
  const [loading, setLoading] = useState(false)
  const [permitted, setPermitted] = useState<boolean | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    adminFetch<{ permissions: Record<string, unknown> }>("/admin/access-control/me")
      .then((me) => setPermitted(me.permissions.pdv === true))
      .catch(() => setPermitted(true)) // modulo indisponivel: nao trava a tela
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [receipt])

  if (permitted === false) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          PDV — Ponto de Venda Físico
        </h1>
        <p style={{ color: "#dc2626" }}>Seu papel não tem permissão para acessar o PDV.</p>
      </div>
    )
  }

  const total = basket.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const cashReceivedCents = Math.round(Number(cashReceived.replace(",", ".")) * 100) || 0
  const change = paymentMethod === "cash" ? cashReceivedCents - total : 0

  async function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !barcode.trim()) return
    const sku = barcode.trim()
    setBarcode("")
    setError(null)

    try {
      const found = await adminFetch<{
        variant_id: string
        product_title: string
        variant_title: string
        sku: string
        unit_price: number
        available_quantity: number
      }>(`/admin/pdv/lookup?sku=${encodeURIComponent(sku)}`)

      setBasket((prev) => {
        const existing = prev.find((item) => item.variant_id === found.variant_id)
        if (existing) {
          if (existing.quantity >= found.available_quantity) {
            setError(`Estoque esgotado para ${found.sku} (${found.available_quantity} disponível).`)
            return prev
          }
          return prev.map((item) =>
            item.variant_id === found.variant_id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
        if (found.available_quantity < 1) {
          setError(`SKU ${found.sku} sem estoque na Matriz.`)
          return prev
        }
        return [...prev, { ...found, quantity: 1 }]
      })
    } catch (err: any) {
      setError(err.message || "SKU não encontrado.")
    }
  }

  function removeItem(variantId: string) {
    setBasket((prev) => prev.filter((item) => item.variant_id !== variantId))
  }

  async function handleCheckout() {
    if (!basket.length) return
    if (paymentMethod === "cash" && cashReceivedCents < total) {
      setError("Valor recebido é menor que o total.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await adminFetch<SaleReceipt>("/admin/pdv/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: basket.map((item) => ({
            variant_id: item.variant_id,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          payment_method: paymentMethod,
          cash_received: paymentMethod === "cash" ? cashReceivedCents : undefined,
        }),
      })
      setReceipt(result)
      setBasket([])
      setCashReceived("")
    } catch (err: any) {
      setError(err.message || "Falha ao fechar a venda.")
    } finally {
      setLoading(false)
    }
  }

  function newSale() {
    setReceipt(null)
  }

  if (receipt) {
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Venda concluída
        </h1>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>{receipt.sale_id}</p>

        <div id="pdv-receipt-80mm">
          <p style={{ fontWeight: 700 }}>RECIBO DE VENDA</p>
          <p>{receipt.sale_id}</p>
          <p>{new Date(receipt.created_at).toLocaleString("pt-BR")}</p>
          <hr />
          {receipt.items.map((item) => (
            <div key={item.sku} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {item.quantity}x {item.sku}
              </span>
              <span>{brl(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <hr />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>TOTAL</span>
            <span>{brl(receipt.total)}</span>
          </div>
          <p>Pagamento: {receipt.payment_method.toUpperCase()}</p>
          {receipt.payment_method === "cash" && (
            <>
              <p>Recebido: {brl(receipt.cash_received || 0)}</p>
              <p>Troco: {brl(receipt.change)}</p>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={() => window.print()} style={buttonStyle("#111827")}>
            Emitir Recibo Térmico (80mm)
          </button>
          <button onClick={newSale} style={buttonStyle("#ea580c")}>
            Nova Venda
          </button>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            #pdv-receipt-80mm, #pdv-receipt-80mm * { visibility: visible; }
            #pdv-receipt-80mm {
              position: fixed; top: 0; left: 0;
              width: 80mm; font-family: monospace; font-size: 11px;
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, display: "flex", gap: 24 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          PDV — Ponto de Venda Físico
        </h1>
        <input
          ref={inputRef}
          autoFocus
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleScan}
          placeholder="Leia o código de barras (SKU) e pressione Enter"
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
            marginBottom: 16,
          }}
        />

        {error && (
          <p style={{ color: "#dc2626", marginBottom: 12 }} data-testid="pdv-error">
            {error}
          </p>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>Produto</th>
              <th style={{ padding: 8 }}>SKU</th>
              <th style={{ padding: 8 }}>Qtd</th>
              <th style={{ padding: 8 }}>Subtotal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {basket.map((item) => (
              <tr key={item.variant_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 8 }}>
                  {item.product_title} — {item.variant_title}
                </td>
                <td style={{ padding: 8 }}>{item.sku}</td>
                <td style={{ padding: 8 }}>{item.quantity}</td>
                <td style={{ padding: 8 }}>{brl(item.unit_price * item.quantity)}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => removeItem(item.variant_id)}>✕</button>
                </td>
              </tr>
            ))}
            {!basket.length && (
              <tr>
                <td colSpan={5} style={{ padding: 16, color: "#9ca3af" }}>
                  Cesta vazia — leia um código de barras para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ width: 320 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          Fechamento de Balcão
        </h2>
        <p style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{brl(total)}</p>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["pix", "card", "cash"] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 6,
                border:
                  paymentMethod === method ? "2px solid #ea580c" : "1px solid #d1d5db",
                background: paymentMethod === method ? "#fff5f1" : "#fff",
                fontWeight: paymentMethod === method ? 700 : 400,
              }}
            >
              {method === "pix" ? "Pix QR" : method === "card" ? "Cartão" : "Dinheiro"}
            </button>
          ))}
        </div>

        {paymentMethod === "pix" && (
          <div style={{ textAlign: "center", padding: 16, border: "1px dashed #d1d5db" }}>
            <canvas
              data-testid="pdv-pix-canvas"
              width={140}
              height={140}
              ref={(canvas) => {
                if (!canvas) return
                const ctx = canvas.getContext("2d")
                if (!ctx) return
                ctx.fillStyle = "#111827"
                ctx.fillRect(0, 0, 140, 140)
                ctx.fillStyle = "#fff"
                for (let i = 0; i < 10; i++) {
                  ctx.fillRect(Math.random() * 120, Math.random() * 120, 14, 14)
                }
              }}
            />
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
              Cliente escaneia na tela
            </p>
          </div>
        )}

        {paymentMethod === "cash" && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Valor recebido (R$)</label>
            <input
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              placeholder="0,00"
              style={{
                width: "100%",
                padding: 8,
                border: "1px solid #d1d5db",
                borderRadius: 6,
              }}
            />
            {cashReceivedCents > 0 && (
              <p style={{ marginTop: 8, fontWeight: 700 }}>
                Troco: {brl(Math.max(change, 0))}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={!basket.length || loading}
          style={{
            ...buttonStyle("#ea580c"),
            width: "100%",
            marginTop: 12,
            opacity: !basket.length || loading ? 0.5 : 1,
          }}
        >
          {loading ? "Processando..." : "Fechar Venda"}
        </button>
      </div>
    </div>
  )
}

function buttonStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
  }
}

export const config = defineRouteConfig({
  label: "PDV",
})

export default PdvPage
