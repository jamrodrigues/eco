/**
 * Logica pura de avaliacoes de produto. Sem I/O, exceto os dois services
 * recebidos por parametro em syncProductReviewSummary.
 *
 * ATENCAO: productService.updateProducts SUBSTITUI o metadata inteiro do
 * produto — por isso syncProductReviewSummary sempre espalha o metadata
 * existente antes de gravar (mesmo padrao de product-stats/sold-count.ts).
 */

export type ReviewSummary = {
  review_count: number
  review_avg: number
  by_rating: Record<1 | 2 | 3 | 4 | 5, number>
}

/**
 * Mascara o nome do autor no formato "j*****a": primeira letra do primeiro
 * nome (minuscula) + 5 asteriscos + ultima letra do sobrenome (ou do
 * primeiro nome, se nao houver sobrenome).
 */
export function maskAuthorName(
  firstName: string | null | undefined,
  lastName?: string | null
): string {
  const first = (firstName ?? "").trim()
  const last = (lastName ?? "").trim()
  if (!first && !last) return "Cliente"

  const initial = (first || last).charAt(0).toLowerCase()
  const ending = (last || first).slice(-1).toLowerCase()
  return `${initial}*****${ending}`
}

export function computeSummary(reviews: { rating: number }[]): ReviewSummary {
  const by_rating: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }

  if (reviews.length === 0) {
    return { review_count: 0, review_avg: 0, by_rating }
  }

  let total = 0
  for (const review of reviews) {
    total += review.rating
    const bucket = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5
    if (bucket in by_rating) by_rating[bucket] += 1
  }

  const review_avg = Math.round((total / reviews.length) * 10) / 10
  return { review_count: reviews.length, review_avg, by_rating }
}

export type SyncReviewSummaryDeps = {
  reviewsService: {
    listProductReviews(filters: Record<string, unknown>): Promise<any[]>
  }
  productService: {
    retrieveProduct(id: string): Promise<any>
    updateProducts(id: string, data: any): Promise<any>
  }
}

/**
 * Recalcula o resumo de avaliacoes aprovadas do produto e grava
 * review_count / review_avg em product.metadata, preservando o resto.
 */
export async function syncProductReviewSummary(
  deps: SyncReviewSummaryDeps,
  productId: string
): Promise<void> {
  const approved = await deps.reviewsService.listProductReviews({
    product_id: productId,
    status: "approved",
  })
  const summary = computeSummary(approved)

  const product = await deps.productService.retrieveProduct(productId)
  const metadata = product?.metadata ?? {}

  await deps.productService.updateProducts(productId, {
    metadata: {
      ...metadata,
      review_count: summary.review_count,
      review_avg: summary.review_avg,
    },
  })
}
