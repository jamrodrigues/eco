import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEWS_MODULE } from "../../../modules/product-reviews"
import type ProductReviewsModuleService from "../../../modules/product-reviews/service"

const STATUSES = ["pending", "approved", "rejected"] as const

/**
 * GET /admin/product-reviews?status=pending|approved|rejected|all
 *
 * Lista avaliacoes para moderacao (default: pending). Cada item traz
 * product_title, buscado num unico query.graph batched pelos ids unicos.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const statusParam =
    typeof req.query.status === "string" && req.query.status !== ""
      ? req.query.status
      : "pending"

  const filters: Record<string, unknown> = {}
  if (statusParam !== "all") {
    if (!(STATUSES as readonly string[]).includes(statusParam)) {
      return res.status(400).json({
        message: 'status deve ser "pending", "approved", "rejected" ou "all".',
      })
    }
    filters.status = statusParam
  }

  const reviewsService: ProductReviewsModuleService = req.scope.resolve(PRODUCT_REVIEWS_MODULE)
  const reviews = await reviewsService.listProductReviews(filters, {
    order: { created_at: "DESC" },
  })

  const productIds = [...new Set(reviews.map((review) => review.product_id as string))]
  const titles = new Map<string, string>()
  if (productIds.length > 0) {
    const query: any = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: "product",
      filters: { id: productIds },
      fields: ["id", "title"],
    })
    for (const product of products as { id: string; title: string }[]) {
      titles.set(product.id, product.title)
    }
  }

  res.status(200).json({
    reviews: reviews.map((review) => ({
      ...review,
      product_title: titles.get(review.product_id as string) ?? "",
    })),
  })
}
