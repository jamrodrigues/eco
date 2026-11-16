import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { PRODUCT_REVIEWS_MODULE } from "../../../../modules/product-reviews"
import type ProductReviewsModuleService from "../../../../modules/product-reviews/service"
import { syncProductReviewSummary } from "../../../../modules/product-reviews/summary"

type UpdateBody = { status?: string }

/**
 * PUT /admin/product-reviews/:id — body { status: "approved" | "rejected" }.
 * Recalcula o resumo do produto (product.metadata) depois de gravar.
 */
export async function PUT(req: MedusaRequest<UpdateBody>, res: MedusaResponse) {
  const { id } = req.params as { id: string }
  const status = req.body?.status

  if (status !== "approved" && status !== "rejected") {
    return res
      .status(400)
      .json({ message: 'status deve ser "approved" ou "rejected".' })
  }

  const reviewsService: ProductReviewsModuleService = req.scope.resolve(PRODUCT_REVIEWS_MODULE)
  const [existing] = await reviewsService.listProductReviews({ id })
  if (!existing) {
    return res.status(404).json({ message: "Avaliação não encontrada." })
  }

  // Mesmo padrao de api/admin/institutional-pages e api/store/products/[id]/reviews:
  // mutacao direta no service do modulo (sem workflow). Warning da regra silenciado de proposito.
  // eslint-disable-next-line @medusajs/no-service-mutations-in-api-route
  const review = await reviewsService.updateProductReviews({ id, status })

  await syncProductReviewSummary(
    { reviewsService, productService: req.scope.resolve(Modules.PRODUCT) },
    review.product_id
  )

  res.status(200).json({ review })
}

/**
 * DELETE /admin/product-reviews/:id — apaga e recalcula o resumo do produto
 * (remove a nota da avaliacao se ela estava aprovada).
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params as { id: string }

  const reviewsService: ProductReviewsModuleService = req.scope.resolve(PRODUCT_REVIEWS_MODULE)
  const [existing] = await reviewsService.listProductReviews({ id })
  if (!existing) {
    return res.status(404).json({ message: "Avaliação não encontrada." })
  }

  // Mesmo padrao acima: mutacao direta no service, warning da regra silenciado de proposito.
  // eslint-disable-next-line @medusajs/no-service-mutations-in-api-route
  await reviewsService.deleteProductReviews(id)

  await syncProductReviewSummary(
    { reviewsService, productService: req.scope.resolve(Modules.PRODUCT) },
    existing.product_id
  )

  res.status(200).json({ id, deleted: true })
}
