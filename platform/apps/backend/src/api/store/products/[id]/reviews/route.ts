import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_REVIEWS_MODULE } from "../../../../../modules/product-reviews"
import type ProductReviewsModuleService from "../../../../../modules/product-reviews/service"
import {
  computeSummary,
  maskAuthorName,
} from "../../../../../modules/product-reviews/summary"
import { validateReviewBody } from "./validate"

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

/**
 * GET /store/products/:id/reviews?limit=10&offset=0&rating=5
 *
 * Lista so as avaliacoes "approved", mais recentes primeiro. O `summary`
 * e calculado sobre TODAS as aprovadas do produto (independente de
 * paginacao e do filtro de nota), pra o cabecalho da secao nao mudar
 * quando o cliente filtra a lista.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id: productId } = req.params as { id: string }
  const reviewsService: ProductReviewsModuleService = req.scope.resolve(PRODUCT_REVIEWS_MODULE)

  const limitRaw = Number(req.query.limit)
  const limit =
    Number.isFinite(limitRaw) && limitRaw >= 1 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT
  const offsetRaw = Number(req.query.offset)
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0

  let rating: number | undefined
  if (req.query.rating !== undefined && req.query.rating !== "") {
    const parsed = Number(req.query.rating)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
      return res.status(400).json({ message: "Nota deve ser de 1 a 5." })
    }
    rating = parsed
  }

  const filters: Record<string, unknown> = { product_id: productId, status: "approved" }
  if (rating !== undefined) filters.rating = rating

  const [reviews, count] = await reviewsService.listAndCountProductReviews(filters, {
    order: { created_at: "DESC" },
    take: limit,
    skip: offset,
  })

  const allApproved = await reviewsService.listProductReviews(
    { product_id: productId, status: "approved" },
    { select: ["rating"] }
  )

  res.status(200).json({
    reviews: reviews.map((r: any) => ({
      id: r.id,
      author_name: r.author_name,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified_purchase: r.verified_purchase,
      created_at: r.created_at,
    })),
    count,
    summary: computeSummary(allApproved as { rating: number }[]),
  })
}

/**
 * POST /store/products/:id/reviews
 *
 * Cria uma avaliacao em status "pending" (so aparece no GET depois que o
 * admin aprovar). Um cliente so pode avaliar cada produto uma vez, em
 * qualquer status.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id: productId } = req.params as { id: string }

  const validation = validateReviewBody(req.body)
  if (!validation.ok) {
    return res.status(400).json({ message: validation.message })
  }

  const customerId = (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
    ?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Sessão de cliente inválida." })
  }

  const query: any = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    filters: { id: productId },
    fields: ["id"],
  })
  if (!products?.length) {
    return res.status(404).json({ message: "Produto não encontrado." })
  }

  const reviewsService: ProductReviewsModuleService = req.scope.resolve(PRODUCT_REVIEWS_MODULE)
  const existing = await reviewsService.listProductReviews({
    product_id: productId,
    customer_id: customerId,
  })
  if (existing.length > 0) {
    return res.status(409).json({ message: "Você já avaliou este produto." })
  }

  const customerService: any = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerService.retrieveCustomer(customerId)
  const authorName = maskAuthorName(customer.first_name, customer.last_name)

  const { data: orders } = await query.graph({
    entity: "order",
    filters: { customer_id: customerId },
    fields: ["items.product_id"],
  })
  const verifiedPurchase = (orders as any[]).some((order) =>
    (order.items ?? []).some((item: any) => item?.product_id === productId)
  )

  let created: any
  try {
    // Mesmo padrao de api/admin/institutional-pages: mutacao direta no service
    // do modulo (sem workflow). Warning da regra fica silenciado aqui de propósito.
    // eslint-disable-next-line @medusajs/no-service-mutations-in-api-route
    created = await reviewsService.createProductReviews({
      product_id: productId,
      customer_id: customerId,
      author_name: authorName,
      rating: validation.value.rating,
      title: validation.value.title,
      body: validation.value.body,
      verified_purchase: verifiedPurchase,
    })
  } catch (error) {
    // Corrida entre dois POST do mesmo cliente: o indice unico
    // (product_id, customer_id) barra o segundo.
    if (/duplicate|unique/i.test(String((error as Error)?.message ?? error))) {
      return res.status(409).json({ message: "Você já avaliou este produto." })
    }
    throw error
  }

  res.status(201).json({ review: { id: created.id, status: created.status } })
}
