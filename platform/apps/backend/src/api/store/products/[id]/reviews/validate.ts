export type ReviewBodyValue = {
  rating: number
  title: string | null
  body: string
}

export type ReviewBodyResult =
  | { ok: true; value: ReviewBodyValue }
  | { ok: false; message: string }

const RATING_ERROR = "Nota deve ser de 1 a 5."
const BODY_ERROR = "Comentário deve ter entre 10 e 1000 caracteres."
const TITLE_MAX = 80

/**
 * Valida o corpo de POST /store/products/:id/reviews. Puro, sem I/O.
 * Retorna o valor já normalizado (trim aplicado em title e body).
 */
export function validateReviewBody(body: unknown): ReviewBodyResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Corpo da avaliação inválido." }
  }

  const input = body as Record<string, unknown>

  const { rating } = input
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: RATING_ERROR }
  }

  const rawBody = input.body
  if (typeof rawBody !== "string") {
    return { ok: false, message: BODY_ERROR }
  }
  const text = rawBody.trim()
  if (text.length < 10 || text.length > 1000) {
    return { ok: false, message: BODY_ERROR }
  }

  const rawTitle = input.title
  let title: string | null = null
  if (rawTitle !== undefined && rawTitle !== null) {
    if (typeof rawTitle !== "string") {
      return { ok: false, message: `Título deve ter no máximo ${TITLE_MAX} caracteres.` }
    }
    const trimmed = rawTitle.trim()
    if (trimmed.length > TITLE_MAX) {
      return { ok: false, message: `Título deve ter no máximo ${TITLE_MAX} caracteres.` }
    }
    title = trimmed.length > 0 ? trimmed : null
  }

  return { ok: true, value: { rating, title, body: text } }
}
