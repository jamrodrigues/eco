import { validateReviewBody } from "../validate"

const validBody = "Produto muito bom, recomendo a compra."

describe("validateReviewBody", () => {
  it("rejeita nota 0", () => {
    const result = validateReviewBody({ rating: 0, body: validBody })
    expect(result).toEqual({ ok: false, message: "Nota deve ser de 1 a 5." })
  })

  it("rejeita nota fracionada", () => {
    const result = validateReviewBody({ rating: 3.5, body: validBody })
    expect(result).toEqual({ ok: false, message: "Nota deve ser de 1 a 5." })
  })

  it("rejeita comentario com 5 caracteres", () => {
    const result = validateReviewBody({ rating: 4, body: "legal" })
    expect(result).toEqual({
      ok: false,
      message: "Comentário deve ter entre 10 e 1000 caracteres.",
    })
  })

  it("aplica trim no body retornado quando valido", () => {
    const result = validateReviewBody({
      rating: 5,
      body: "   Produto muito bom, recomendo a compra.   ",
    })
    expect(result).toEqual({
      ok: true,
      value: { rating: 5, title: null, body: validBody },
    })
  })

  it("retorna title null quando title esta ausente", () => {
    const result = validateReviewBody({ rating: 5, body: validBody })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.title).toBeNull()
  })

  it("retorna title null quando title vem vazio", () => {
    const result = validateReviewBody({ rating: 5, title: "   ", body: validBody })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.title).toBeNull()
  })

  it("aceita title com ate 80 caracteres e aplica trim", () => {
    const result = validateReviewBody({
      rating: 5,
      title: `  ${"a".repeat(80)}  `,
      body: validBody,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.title).toBe("a".repeat(80))
  })

  it("rejeita title com mais de 80 caracteres", () => {
    const result = validateReviewBody({
      rating: 5,
      title: "a".repeat(81),
      body: validBody,
    })
    expect(result.ok).toBe(false)
  })

  it("rejeita body que nao e objeto", () => {
    expect(validateReviewBody(null).ok).toBe(false)
    expect(validateReviewBody("texto").ok).toBe(false)
    expect(validateReviewBody(undefined).ok).toBe(false)
  })
})
