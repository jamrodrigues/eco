import { resolveFlashSale } from "../resolve"

const NOW = new Date("2026-11-15T12:00:00.000Z")
const inHours = (h: number) => new Date(NOW.getTime() + h * 3600 * 1000)

function makeDeps(priceLists: any[], variants: any[] = []) {
  return {
    pricing: {
      listPriceLists: jest.fn().mockResolvedValue(priceLists),
    },
    query: {
      graph: jest.fn().mockResolvedValue({ data: variants }),
    },
  }
}

// Catálogo de exemplo: cada variante aponta pro seu price_set e pro produto.
const variants = [
  { id: "variant_1", product_id: "prod_1", price_set: { id: "pset_1" } },
  { id: "variant_2", product_id: "prod_2", price_set: { id: "pset_2" } },
  { id: "variant_3", product_id: "prod_3", price_set: { id: "pset_3" } },
]

describe("resolveFlashSale", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("price list ativa com ends_at futuro → active true com product_ids mapeados", async () => {
    const deps = makeDeps(
      [
        {
          id: "pl_1",
          title: "Relâmpago teste",
          starts_at: null,
          ends_at: inHours(1),
          prices: [{ price_set_id: "pset_1" }, { price_set_id: "pset_2" }],
        },
      ],
      variants
    )

    const result = await resolveFlashSale(deps as any, NOW)

    expect(deps.pricing.listPriceLists).toHaveBeenCalledWith(
      { status: "active", type: "sale" },
      { relations: ["prices"] }
    )
    expect(result).toEqual({
      active: true,
      title: "Relâmpago teste",
      ends_at: inHours(1).toISOString(),
      product_ids: ["prod_1", "prod_2"],
    })
  })

  it("ends_at no passado → active false", async () => {
    const deps = makeDeps(
      [
        {
          id: "pl_1",
          title: "Expirada",
          starts_at: null,
          ends_at: inHours(-1),
          prices: [{ price_set_id: "pset_1" }],
        },
      ],
      variants
    )

    expect(await resolveFlashSale(deps as any, NOW)).toEqual({ active: false })
  })

  it("ends_at nulo → active false", async () => {
    const deps = makeDeps(
      [
        {
          id: "pl_1",
          title: "Sem fim",
          starts_at: null,
          ends_at: null,
          prices: [{ price_set_id: "pset_1" }],
        },
      ],
      variants
    )

    expect(await resolveFlashSale(deps as any, NOW)).toEqual({ active: false })
  })

  it("duas ativas → escolhe a que termina primeiro", async () => {
    const deps = makeDeps(
      [
        {
          id: "pl_longa",
          title: "Longa",
          starts_at: null,
          ends_at: inHours(5),
          prices: [{ price_set_id: "pset_3" }],
        },
        {
          id: "pl_curta",
          title: "Curta",
          starts_at: null,
          ends_at: inHours(1),
          prices: [{ price_set_id: "pset_1" }],
        },
      ],
      variants
    )

    const result = await resolveFlashSale(deps as any, NOW)

    expect(result).toEqual({
      active: true,
      title: "Curta",
      ends_at: inHours(1).toISOString(),
      product_ids: ["prod_1"],
    })
  })
})
