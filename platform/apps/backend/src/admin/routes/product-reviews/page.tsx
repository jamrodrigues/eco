import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

type ReviewStatus = "pending" | "approved" | "rejected"

type ProductReview = {
  id: string
  product_id: string
  product_title: string
  author_name: string
  rating: number
  title: string | null
  body: string
  status: ReviewStatus
  verified_purchase: boolean
  created_at: string
}

const TABS: { status: ReviewStatus; label: string }[] = [
  { status: "pending", label: "Pendentes" },
  { status: "approved", label: "Aprovadas" },
  { status: "rejected", label: "Rejeitadas" },
]

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

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)))
  return "★".repeat(filled) + "☆".repeat(5 - filled)
}

const ProductReviewsPage = () => {
  const [tab, setTab] = useState<ReviewStatus>("pending")
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permitted, setPermitted] = useState<boolean | null>(null)

  async function load(status: ReviewStatus) {
    setLoading(true)
    setError(null)
    try {
      const { reviews: list } = await adminFetch<{ reviews: ProductReview[] }>(
        `/admin/product-reviews?status=${status}`
      )
      setReviews(list)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    adminFetch<{ permissions: Record<string, unknown> }>("/admin/access-control/me")
      .then((me) => setPermitted(me.permissions.product_reviews === true))
      .catch(() => setPermitted(true)) // modulo indisponivel: nao trava a tela
  }, [])

  useEffect(() => {
    load(tab)
  }, [tab])

  async function moderate(review: ProductReview, status: "approved" | "rejected") {
    setBusyId(review.id)
    setError(null)
    try {
      await adminFetch(`/admin/product-reviews/${review.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      })
      await load(tab)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function remove(review: ProductReview) {
    if (!window.confirm("Excluir esta avaliação? Essa ação não pode ser desfeita.")) return
    setBusyId(review.id)
    setError(null)
    try {
      await adminFetch(`/admin/product-reviews/${review.id}`, { method: "DELETE" })
      await load(tab)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (permitted === false) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Avaliações</h1>
        <p style={{ color: "#dc2626" }}>Seu papel não tem permissão para acessar Avaliações.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Avaliações</h1>
      <p style={{ color: "#6b7280", marginBottom: 16, fontSize: 13 }}>
        Só as avaliações aprovadas aparecem na loja. A nota média do produto é recalculada a cada
        aprovação, rejeição ou exclusão.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TABS.map((item) => (
          <button
            key={item.status}
            onClick={() => setTab(item.status)}
            style={{
              ...buttonStyle(tab === item.status ? "#ea580c" : "#f3f4f6"),
              color: tab === item.status ? "#fff" : "#374151",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}

      {loading ? (
        <p>Carregando...</p>
      ) : reviews.length === 0 ? (
        <p style={{ color: "#6b7280" }}>Nenhuma avaliação nesta lista.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>Produto</th>
              <th style={{ padding: 8 }}>Autor</th>
              <th style={{ padding: 8 }}>Nota</th>
              <th style={{ padding: 8 }}>Avaliação</th>
              <th style={{ padding: 8 }}>Data</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} style={{ borderBottom: "1px solid #f3f4f6", verticalAlign: "top" }}>
                <td style={{ padding: 8 }}>{review.product_title}</td>
                <td style={{ padding: 8 }}>{review.author_name}</td>
                <td style={{ padding: 8, color: "#ea580c", whiteSpace: "nowrap" }}>
                  {stars(review.rating)}
                </td>
                <td style={{ padding: 8, maxWidth: 360 }}>
                  {review.title && <div style={{ fontWeight: 600 }}>{review.title}</div>}
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{review.body}</div>
                  {review.verified_purchase && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#047857",
                        background: "#d1fae5",
                        borderRadius: 4,
                        padding: "2px 6px",
                      }}
                    >
                      Compra verificada
                    </span>
                  )}
                </td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>{formatDate(review.created_at)}</td>
                <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      disabled={busyId === review.id}
                      onClick={() => moderate(review, "approved")}
                      style={buttonStyle("#059669")}
                    >
                      Aprovar
                    </button>
                    <button
                      disabled={busyId === review.id}
                      onClick={() => moderate(review, "rejected")}
                      style={buttonStyle("#6b7280")}
                    >
                      Rejeitar
                    </button>
                    <button
                      disabled={busyId === review.id}
                      onClick={() => remove(review)}
                      style={buttonStyle("#dc2626")}
                    >
                      Excluir
                    </button>
                  </div>
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
    padding: "6px 12px",
    fontWeight: 600,
    cursor: "pointer",
  }
}

export const config = defineRouteConfig({
  label: "Avaliações",
})

export default ProductReviewsPage
