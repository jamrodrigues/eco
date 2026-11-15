import { applySoldCount } from "../sold-count"

function makeDeps(order: any, productMetadata: Record<string, any> = {}) {
  const deps = {
    query: {
      graph: jest.fn().mockResolvedValue({ data: order ? [order] : [] }),
    },
    productService: {
      retrieveProduct: jest.fn().mockImplementation(async (id: string) => ({
        id,
        metadata: productMetadata[id] ?? null,
      })),
      updateProducts: jest.fn().mockResolvedValue({}),
    },
    orderService: {
      updateOrders: jest.fn().mockResolvedValue({}),
    },
  }
  return deps
}

describe("applySoldCount", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("soma a quantidade por produto, preserva o metadata existente e marca o pedido", async () => {
    const deps = makeDeps(
      {
        id: "order_1",
        status: "pending",
        metadata: { origem: "site" },
        items: [
          { product_id: "prod_1", quantity: 1 },
          { product_id: "prod_1", quantity: 2 },
        ],
      },
      { prod_1: { sold_count: 10, outra_chave: "mantida" } }
    )

    const result = await applySoldCount(deps as any, "order_1")

    expect(result).toEqual({ updated: ["prod_1"], skipped: false })
    expect(deps.productService.updateProducts).toHaveBeenCalledTimes(1)
    expect(deps.productService.updateProducts).toHaveBeenCalledWith("prod_1", {
      metadata: { sold_count: 13, outra_chave: "mantida" },
    })
    expect(deps.orderService.updateOrders).toHaveBeenCalledWith([
      { id: "order_1", metadata: { origem: "site", sold_counted: true } },
    ])
  })

  it("não conta de novo um pedido já marcado com sold_counted", async () => {
    const deps = makeDeps({
      id: "order_2",
      status: "pending",
      metadata: { sold_counted: true },
      items: [{ product_id: "prod_1", quantity: 1 }],
    })

    const result = await applySoldCount(deps as any, "order_2")

    expect(result).toEqual({ updated: [], skipped: true })
    expect(deps.productService.updateProducts).not.toHaveBeenCalled()
    expect(deps.orderService.updateOrders).not.toHaveBeenCalled()
  })

  it("ignora pedido cancelado", async () => {
    const deps = makeDeps({
      id: "order_3",
      status: "canceled",
      metadata: null,
      items: [{ product_id: "prod_1", quantity: 1 }],
    })

    const result = await applySoldCount(deps as any, "order_3")

    expect(result).toEqual({ updated: [], skipped: true })
    expect(deps.productService.updateProducts).not.toHaveBeenCalled()
    expect(deps.orderService.updateOrders).not.toHaveBeenCalled()
  })
})
