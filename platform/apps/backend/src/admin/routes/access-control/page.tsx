import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

type PermissionValue = true | false | "read_only"
type PermissionMap = Record<string, PermissionValue>

type Me = {
  role_slug: string
  role_name: string
  permissions: PermissionMap
}

type RoleDef = {
  slug: string
  name: string
  permissions: PermissionMap
}

type AdminUser = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role_slug: string
  role_name: string
}

type MaintenanceSettings = {
  is_enabled: boolean
  message: string | null
}

type GatewaySettings = {
  active_gateway: string
}

const CATEGORY_LABELS: Record<string, string> = {
  orders: "Pedidos",
  customers: "Clientes",
  products_inventory: "Produtos/Estoque",
  promotions: "Promoções",
  store_coins: "Moedas",
  pdv: "PDV",
  institutional_pages: "Páginas Institucionais",
  settings: "Configurações (loja/idioma/SEO)",
  maintenance_mode: "Modo Manutenção",
  user_management: "Gestão de Usuários",
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

function permissionLabel(v: PermissionValue) {
  if (v === true) return "✓"
  if (v === "read_only") return "só leitura"
  return "—"
}

const AccessControlPage = () => {
  const [me, setMe] = useState<Me | null>(null)
  const [roles, setRoles] = useState<RoleDef[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceSettings | null>(null)
  const [maintenanceMsg, setMaintenanceMsg] = useState("")
  const [gateway, setGateway] = useState<GatewaySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [savingGateway, setSavingGateway] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const meResult = await adminFetch<Me>("/admin/access-control/me")
      setMe(meResult)

      const { roles: roleResult } = await adminFetch<{ roles: RoleDef[] }>(
        "/admin/access-control/roles"
      )
      setRoles(roleResult)

      if (meResult.permissions.user_management === true) {
        const { users: userResult } = await adminFetch<{ users: AdminUser[] }>(
          "/admin/access-control/users"
        )
        setUsers(userResult)
      }

      if (meResult.permissions.maintenance_mode === true) {
        const { settings } = await adminFetch<{ settings: MaintenanceSettings }>(
          "/admin/access-control/maintenance"
        )
        setMaintenance(settings)
        setMaintenanceMsg(settings.message || "")
      }

      if (meResult.permissions.payment_gateway === true) {
        const { settings } = await adminFetch<{ settings: GatewaySettings }>(
          "/admin/access-control/payment-gateway"
        )
        setGateway(settings)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function changeRole(userId: string, roleSlug: string) {
    try {
      await adminFetch(`/admin/access-control/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ role_slug: roleSlug }),
      })
      load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function toggleMaintenance() {
    if (!maintenance) return
    setSavingMaintenance(true)
    try {
      const { settings } = await adminFetch<{ settings: MaintenanceSettings }>(
        "/admin/access-control/maintenance",
        {
          method: "PUT",
          body: JSON.stringify({
            is_enabled: !maintenance.is_enabled,
            message: maintenanceMsg || null,
          }),
        }
      )
      setMaintenance(settings)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingMaintenance(false)
    }
  }

  async function saveMaintenanceMessage() {
    if (!maintenance) return
    setSavingMaintenance(true)
    try {
      const { settings } = await adminFetch<{ settings: MaintenanceSettings }>(
        "/admin/access-control/maintenance",
        {
          method: "PUT",
          body: JSON.stringify({ message: maintenanceMsg || null }),
        }
      )
      setMaintenance(settings)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingMaintenance(false)
    }
  }

  async function switchGateway(next: "mercadopago" | "pagarme") {
    if (!gateway || gateway.active_gateway === next) return
    setSavingGateway(true)
    try {
      const { settings } = await adminFetch<{ settings: GatewaySettings }>(
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

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Controle de Acesso</h1>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Papéis fixos por enquanto (sem editor de matriz). Bloqueio real acontece no servidor —
        o item continua no menu, mas salvar sem permissão falha com 403.
      </p>

      {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}

      <div style={{ marginBottom: 24 }}>
        <strong>Seu papel: </strong>
        {me?.role_name}
      </div>

      {me?.permissions.user_management === true && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Usuários Admin</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: 8 }}>Email</th>
                <th style={{ padding: 8 }}>Papel</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8 }}>{u.email}</td>
                  <td style={{ padding: 8 }}>
                    <select
                      value={u.role_slug}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                      }}
                    >
                      {roles.map((r) => (
                        <option key={r.slug} value={r.slug}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {me?.permissions.maintenance_mode === true && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Modo Manutenção</h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
            Quando ligado, o storefront (loja pública) mostra uma página de manutenção pra
            qualquer visitante. O Admin continua acessível normalmente.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button
              onClick={toggleMaintenance}
              disabled={savingMaintenance}
              style={{
                background: maintenance?.is_enabled ? "#dc2626" : "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {maintenance?.is_enabled ? "Desligar manutenção" : "Ligar manutenção"}
            </button>
            <span style={{ fontSize: 13 }}>
              Status atual:{" "}
              <strong>{maintenance?.is_enabled ? "EM MANUTENÇÃO" : "loja no ar"}</strong>
            </span>
          </div>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
            Mensagem (opcional)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              placeholder="Voltamos em breve!"
              style={{
                flex: 1,
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
              }}
            />
            <button
              onClick={saveMaintenanceMessage}
              disabled={savingMaintenance}
              style={{
                background: "#ea580c",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Salvar mensagem
            </button>
          </div>
        </div>
      )}

      {me?.permissions.payment_gateway === true && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Gateway de Pagamento</h2>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
            Define qual gateway de pagamento processa os pedidos da loja.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button
              onClick={() => switchGateway("mercadopago")}
              disabled={savingGateway}
              style={{
                background: gateway?.active_gateway === "mercadopago" ? "#16a34a" : "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Mercado Pago
            </button>
            <button
              onClick={() => switchGateway("pagarme")}
              disabled={savingGateway}
              style={{
                background: gateway?.active_gateway === "pagarme" ? "#16a34a" : "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Pagar.me
            </button>
            <span style={{ fontSize: 13 }}>
              Gateway ativo: <strong>{gateway?.active_gateway}</strong>
            </span>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
          Matriz de Permissões (fixa)
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>Categoria</th>
              {roles.map((r) => (
                <th key={r.slug} style={{ padding: 8 }}>
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <tr key={cat} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 8 }}>{CATEGORY_LABELS[cat]}</td>
                {roles.map((r) => (
                  <td key={r.slug} style={{ padding: 8, textAlign: "center" }}>
                    {permissionLabel(r.permissions[cat])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Controle de Acesso",
})

export default AccessControlPage
