import { mergeWithRoleDefaults, ROLE_DEFINITIONS } from "../permissions"

describe("mergeWithRoleDefaults", () => {
  it("uses the role default for a category missing from the stored permissions", () => {
    const merged = mergeWithRoleDefaults("atendimento_marketing", {
      orders: true,
      customers: true,
    })

    expect(merged.product_reviews).toBe(true)
    expect(merged.banners).toBe(true)
  })

  it("lets a stored value override the role default", () => {
    const merged = mergeWithRoleDefaults("atendimento_marketing", {
      orders: false,
    })

    expect(merged.orders).toBe(false)
  })

  it("falls back to the first role definition when the slug is unknown", () => {
    const merged = mergeWithRoleDefaults("papel_inexistente", null)
    const first = ROLE_DEFINITIONS[0].permissions

    expect(merged).toEqual(first)
  })
})
