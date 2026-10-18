import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

type Settings = {
  coins_per_real: number
  cashback_percent: number
  max_redeem_per_order: number
  expiration_days: number | null
}

type CustomerRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  coins_balance: number
}

type LedgerEntry = {
  id: string
  amount: number
  type: string
  reference_id: string | null
  note: string | null
  expires_at: string | null
  created_at: string
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `${response.status}`)
  }
  return response.json()
}

const TYPE_LABELS: Record<string, string> = {
  purchase_cashback: "Cashback de compra",
  signup_bonus: "Bônus de cadastro",
  review_bonus: "Bônus de avaliação",
  referral_bonus: "Bônus de indicação",
  redeemed: "Resgatado no checkout",
  expired: "Expirado",
  manual_admin_adjust: "Ajuste manual",
}

const StoreCoinsPage = () => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [selected, setSelected] = useState<CustomerRow | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])

  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustNote, setAdjustNote] = useState("")
  const [adjusting, setAdjusting] = useState(false)
  const [adjustError, setAdjustError] = useState<string | null>(null)

  async function loadSettings() {
    const { settings } = await adminFetch<{ settings: Settings }>("/admin/store-coins/settings")
    setSettings(settings)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  async function saveSettings() {
    if (!settings) return
    setSavingSettings(true)
    setSettingsMsg(null)
    try {
      await adminFetch("/admin/store-coins/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      })
      setSettingsMsg("Salvo.")
    } catch (err: any) {
      setSettingsMsg(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  async function search() {
    const { customers } = await adminFetch<{ customers: CustomerRow[] }>(
      `/admin/store-coins/customers?q=${encodeURIComponent(query)}`
    )
    setCustomers(customers)
  }

  async function openCustomer(c: CustomerRow) {
    setSelected(c)
    setAdjustError(null)
    const { ledger } = await adminFetch<{ ledger: LedgerEntry[] }>(
      `/admin/store-coins/customers/${c.id}`
    )
    setLedger(ledger)
  }

  async function submitAdjust() {
    if (!selected) return
    const amount = Number(adjustAmount)
    if (!amount || !adjustNote.trim()) {
      setAdjustError("Informe um valor diferente de zero e uma nota.")
      return
    }
    setAdjusting(true)
    setAdjustError(null)
    try {
      await adminFetch(`/admin/store-coins/customers/${selected.id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ amount, note: adjustNote }),
      })
      setAdjustAmount("")
      setAdjustNote("")
      await openCustomer(selected)
    } catch (err: any) {
      setAdjustError(err.message)
    } finally {
      setAdjusting(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Moedas (Store Coins)</h1>
      <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 13 }}>
        Programa de cashback/carteira do cliente. Mudanças aqui valem na hora, sem deploy.
      </p>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Configuração</h2>
        {!settings ? (
          <p>Carregando...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field
              label="Moedas por R$1"
              value={settings.coins_per_real}
              onChange={(v) => setSettings({ ...settings, coins_per_real: v })}
            />
            <Field
              label="% de cashback por compra"
              value={settings.cashback_percent}
              onChange={(v) => setSettings({ ...settings, cashback_percent: v })}
            />
            <Field
              label="Teto de resgate por pedido (moedas)"
              value={settings.max_redeem_per_order}
              onChange={(v) => setSettings({ ...settings, max_redeem_per_order: v })}
            />
            <Field
              label="Validade (dias, vazio = nunca expira)"
              value={settings.expiration_days ?? ""}
              onChange={(v) =>
                setSettings({ ...settings, expiration_days: Number.isNaN(v) ? null : v })
              }
              allowEmpty
            />
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={saveSettings} disabled={savingSettings} style={buttonStyle("#ea580c")}>
            {savingSettings ? "Salvando..." : "Salvar configuração"}
          </button>
          {settingsMsg && <span style={{ fontSize: 13, color: "#6b7280" }}>{settingsMsg}</span>}
        </div>
      </section>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Clientes</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Buscar por e-mail"
            style={inputStyle}
          />
          <button onClick={search} style={buttonStyle("#6b7280")}>
            Buscar
          </button>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <table style={{ flex: 1, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 6 }}>E-mail</th>
                <th style={{ padding: 6 }}>Saldo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 6 }}>{c.email}</td>
                  <td style={{ padding: 6 }}>{c.coins_balance}</td>
                  <td style={{ padding: 6 }}>
                    <button onClick={() => openCustomer(c)} style={buttonStyle("#ea580c")}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {selected && (
            <div style={{ flex: 1, borderLeft: "1px solid #e5e7eb", paddingLeft: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>{selected.email}</h3>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                Saldo atual: <strong>{selected.coins_balance}</strong> moedas
              </p>

              <div style={{ marginBottom: 12 }}>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Valor (+credita / -debita)"
                  style={{ ...inputStyle, width: "100%", marginBottom: 6 }}
                />
                <input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Motivo do ajuste"
                  style={{ ...inputStyle, width: "100%", marginBottom: 6 }}
                />
                {adjustError && (
                  <p style={{ color: "#dc2626", fontSize: 12, marginBottom: 6 }}>{adjustError}</p>
                )}
                <button onClick={submitAdjust} disabled={adjusting} style={buttonStyle("#ea580c")}>
                  {adjusting ? "Aplicando..." : "Aplicar ajuste manual"}
                </button>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Extrato</h4>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {ledger.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      fontSize: 12,
                      padding: "6px 0",
                      borderBottom: "1px solid #f3f4f6",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {TYPE_LABELS[t.type] || t.type}
                      {t.note ? ` — ${t.note}` : ""}
                    </span>
                    <strong style={{ color: t.amount < 0 ? "#dc2626" : "#16a34a" }}>
                      {t.amount > 0 ? "+" : ""}
                      {t.amount}
                    </strong>
                  </div>
                ))}
                {ledger.length === 0 && (
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>Nenhum lançamento ainda.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  allowEmpty,
}: {
  label: string
  value: number | string
  onChange: (v: number) => void
  allowEmpty?: boolean
}) {
  return (
    <label style={{ fontSize: 12, color: "#374151" }}>
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === "" && allowEmpty ? NaN : Number(raw))
        }}
        style={{ ...inputStyle, width: "100%", marginTop: 4 }}
      />
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  background: "#fff",
  color: "#111827",
}

function buttonStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "7px 14px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
  }
}

export const config = defineRouteConfig({
  label: "Moedas (Store Coins)",
})

export default StoreCoinsPage
