import {
  maskAuthorName,
  computeSummary,
  syncProductReviewSummary,
} from "../summary"

describe("maskAuthorName", () => {
  it("mascara com primeira letra, asteriscos e ultima letra do sobrenome", () => {
    expect(maskAuthorName("joao", "silva")).toBe("j*****a")
  })

  it("usa a ultima letra do primeiro nome quando nao ha sobrenome", () => {
    expect(maskAuthorName("joao", null)).toBe("j*****o")
  })

  it("retorna 'Cliente' quando nao ha nome nenhum", () => {
    expect(maskAuthorName(null)).toBe("Cliente")
    expect(maskAuthorName(undefined, undefined)).toBe("Cliente")
    expect(maskAuthorName("", "")).toBe("Cliente")
  })
})

describe("computeSummary", () => {
  it("calcula contagem, media arredondada e distribuicao", () => {
    expect(computeSummary([{ rating: 5 }, { rating: 4 }, { rating: 5 }])).toEqual({
      review_count: 3,
      review_avg: 4.7,
      by_rating: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
    })
  })

  it("lista vazia zera tudo", () => {
    expect(computeSummary([])).toEqual({
      review_count: 0,
      review_avg: 0,
      by_rating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    })
  })
})

describe("syncProductReviewSummary", () => {
  it("preserva o metadata existente do produto e grava o resumo", async () => {
    const reviewsService = {
      listProductReviews: jest.fn().mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
      ]),
    }
    const productService = {
      retrieveProduct: jest.fn().mockResolvedValue({
        id: "prod_1",
        metadata: { sold_count: 42, keep: "yes" },
      }),
      updateProducts: jest.fn().mockResolvedValue({}),
    }

    await syncProductReviewSummary(
      { reviewsService, productService },
      "prod_1"
    )

    expect(reviewsService.listProductReviews).toHaveBeenCalledWith({
      product_id: "prod_1",
      status: "approved",
    })
    expect(productService.updateProducts).toHaveBeenCalledWith("prod_1", {
      metadata: {
        sold_count: 42,
        keep: "yes",
        review_count: 3,
        review_avg: 4.7,
      },
    })
  })

  it("grava zeros quando o produto nao tem avaliacoes aprovadas", async () => {
    const reviewsService = {
      listProductReviews: jest.fn().mockResolvedValue([]),
    }
    const productService = {
      retrieveProduct: jest.fn().mockResolvedValue({ id: "prod_2", metadata: null }),
      updateProducts: jest.fn().mockResolvedValue({}),
    }

    await syncProductReviewSummary(
      { reviewsService, productService },
      "prod_2"
    )

    expect(productService.updateProducts).toHaveBeenCalledWith("prod_2", {
      metadata: { review_count: 0, review_avg: 0 },
    })
  })
})
