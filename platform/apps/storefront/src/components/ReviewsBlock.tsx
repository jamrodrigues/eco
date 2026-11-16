"use client"

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  getProductReviews,
  postProductReview,
  type ReviewSummary,
  type StoreReview,
} from "@/lib/medusa"
import { getSessionToken, isLoggedIn } from "@/lib/auth"
import { formatRatingLabel } from "@/lib/social-proof"

const RATING_FILTERS: { label: string; value?: number }[] = [
  { label: "Todas" },
  { label: "5 estrelas", value: 5 },
  { label: "4 estrelas", value: 4 },
  { label: "3 estrelas", value: 3 },
  { label: "2 estrelas", value: 2 },
  { label: "1 estrela", value: 1 },
]

type LoadedReviews = {
  key: string
  reviews: StoreReview[]
  count: number
  summary: ReviewSummary
}

// Sessão só existe no browser (cookie); no SSR e na hidratação assume "não logado".
const subscribeNoop = () => () => {}
const getServerLoggedIn = () => false

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function ReviewsBlock({ productId }: { productId: string }) {
  const pathname = usePathname()
  const loggedIn = useSyncExternalStore(subscribeNoop, isLoggedIn, getServerLoggedIn)

  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)
  const key = String(ratingFilter ?? "all")
  const [loaded, setLoaded] = useState<LoadedReviews | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getProductReviews(productId, { rating: ratingFilter })
      .then((data) => {
        if (cancelled) return
        setLoaded({ key, ...data })
        setFailedKey(null)
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key)
      })
    return () => {
      cancelled = true
    }
  }, [productId, ratingFilter, key])

  const current = loaded && loaded.key === key ? loaded : null
  const loadFailed = failedKey === key
  const headerLabel = loaded
    ? formatRatingLabel(loaded.summary.review_avg, loaded.summary.review_count)
    : null

  const [formRating, setFormRating] = useState(5)
  const [formTitle, setFormTitle] = useState("")
  const [formBody, setFormBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const token = getSessionToken()
    if (!token) {
      setFormError("Sua sessão expirou. Entre novamente para avaliar.")
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await postProductReview(productId, token, {
        rating: formRating,
        title: formTitle.trim() || undefined,
        body: formBody.trim(),
      })
      setSubmitted(true)
      setFormTitle("")
      setFormBody("")
    } catch (err) {
      const status = (err as { status?: number }).status
      setFormError(
        status === 409 && err instanceof Error
          ? err.message
          : "Não foi possível enviar sua avaliação. Tente novamente."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-surface border border-black/[.09] rounded p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="font-semibold text-sm">Avaliações</h3>
        {headerLabel && <span className="text-brand font-bold text-sm">{headerLabel}</span>}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {RATING_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setRatingFilter(f.value)}
            aria-pressed={ratingFilter === f.value}
            className={`text-xs px-3 py-1 rounded-full border ${
              ratingFilter === f.value
                ? "border-brand text-brand"
                : "border-black/[.09] text-textSecondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loadFailed && (
          <p className="text-sm text-textSecondary">
            Não foi possível carregar as avaliações agora.
          </p>
        )}
        {!loadFailed && !current && (
          <p className="text-sm text-textSecondary">Carregando avaliações…</p>
        )}
        {current && current.reviews.length === 0 && (
          <p className="text-sm text-textSecondary">
            {ratingFilter === undefined
              ? "Este produto ainda não tem avaliações."
              : "Nenhuma avaliação com essa nota."}
          </p>
        )}
        {current &&
          current.reviews.map((r) => (
            <div key={r.id} className="border-b border-black/[.06] pb-3 last:border-0">
              <p className="text-sm font-semibold flex flex-wrap items-center gap-2">
                <span>{r.author_name}</span>
                {r.verified_purchase && (
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-freeShipping/10 text-freeShipping">
                    Compra verificada
                  </span>
                )}
                <span className="text-textSecondary font-normal text-xs">
                  · {formatDate(r.created_at)}
                </span>
              </p>
              <p className="text-xs text-badgeDiscount" aria-label={`${r.rating} de 5 estrelas`}>
                {"★".repeat(r.rating)}
                <span className="text-black/[.2]">{"★".repeat(5 - r.rating)}</span>
              </p>
              {r.title && <p className="text-sm font-semibold mt-1">{r.title}</p>}
              <p className="text-sm text-textPrimary mt-1">{r.body}</p>
            </div>
          ))}
      </div>

      <div className="mt-6 pt-4 border-t border-black/[.09]">
        <h4 className="font-semibold text-sm mb-3">Avaliar este produto</h4>
        {!loggedIn ? (
          <p className="text-sm text-textSecondary">
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="text-brand font-semibold underline"
            >
              Entre para avaliar
            </Link>
          </p>
        ) : submitted ? (
          <p className="text-sm text-textPrimary">
            Obrigado! Sua avaliação será publicada após moderação.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="block mb-1 text-textSecondary">Nota</span>
              <select
                value={formRating}
                onChange={(e) => setFormRating(Number(e.target.value))}
                className="border border-black/[.15] rounded px-2 py-1 bg-surface"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "estrela" : "estrelas"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block mb-1 text-textSecondary">Título (opcional)</span>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={120}
                className="w-full border border-black/[.15] rounded px-2 py-1 bg-surface"
              />
            </label>
            <label className="block text-sm">
              <span className="block mb-1 text-textSecondary">Comentário</span>
              <textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                required
                rows={4}
                className="w-full border border-black/[.15] rounded px-2 py-1 bg-surface"
              />
            </label>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand text-white font-semibold text-sm px-4 py-2 rounded disabled:opacity-40"
            >
              {submitting ? "Enviando…" : "Enviar avaliação"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
