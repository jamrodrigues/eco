import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

type InstitutionalPage = {
  id: string
  slug: string
  title: string
  body: string[]
}

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

const InstitutionalPagesPage = () => {
  const [pages, setPages] = useState<InstitutionalPage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<InstitutionalPage | null>(null)
  const [title, setTitle] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { institutional_pages } = await adminFetch<{
        institutional_pages: InstitutionalPage[]
      }>("/admin/institutional-pages")
      setPages(institutional_pages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(page: InstitutionalPage) {
    setEditing(page)
    setTitle(page.title)
    setBodyText(page.body.join("\n\n"))
    setError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setError(null)
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    setError(null)
    const body = bodyText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)

    try {
      await adminFetch(`/admin/institutional-pages/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, body }),
      })
      setEditing(null)
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Editar: /institucional/{editing.slug}
        </h1>
        <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
          O slug não pode ser alterado aqui (muda a URL pública).
        </p>

        {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}

        <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
          Título
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
          }}
        />

        <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>
          Corpo do texto (separe parágrafos com uma linha em branco)
        </label>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={10}
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} disabled={saving} style={buttonStyle("#ea580c")}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
          <button onClick={cancelEdit} style={buttonStyle("#6b7280")}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Páginas Institucionais</h1>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Conteúdo exibido em /institucional/[slug] no storefront — editar aqui atualiza o site
        imediatamente, sem deploy.
      </p>

      {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>Slug</th>
              <th style={{ padding: 8 }}>Título</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 8, fontFamily: "monospace", fontSize: 13 }}>{page.slug}</td>
                <td style={{ padding: 8 }}>{page.title}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => startEdit(page)} style={buttonStyle("#ea580c")}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function buttonStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
  }
}

export const config = defineRouteConfig({
  label: "Páginas Institucionais",
})

export default InstitutionalPagesPage
