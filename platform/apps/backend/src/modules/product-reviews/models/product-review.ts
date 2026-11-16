import { model } from "@medusajs/framework/utils"

/**
 * Avaliacao de produto feita por um cliente. author_name ja chega mascarado
 * de quem grava (ver summary.ts > maskAuthorName). So reviews "approved"
 * entram no resumo gravado em product.metadata.
 */
const ProductReview = model
  .define("product_review", {
    id: model.id().primaryKey(),
    product_id: model.text(),
    customer_id: model.text(),
    author_name: model.text(),
    rating: model.number(),
    title: model.text().nullable(),
    body: model.text(),
    status: model.enum(["pending", "approved", "rejected"]).default("pending"),
    verified_purchase: model.boolean().default(false),
  })
  .indexes([
    { name: "IDX_product_review_product_id", on: ["product_id"] },
    { name: "IDX_product_review_status", on: ["status"] },
    {
      name: "IDX_product_review_product_customer_unique",
      on: ["product_id", "customer_id"],
      unique: true,
    },
  ])

export default ProductReview
