import { test, expect, type Page } from "@playwright/test"

// O seletor de simulação de viewport (💻 Desktop / 📱 375px) é um recurso
// só de homologação (process.env.NODE_ENV !== "production") e não faz
// parte do chrome real da loja — mas seu botão flutuante intercepta
// cliques em elementos fixos no rodapé (ex.: "Finalizar Compra"). Escondido
// nos testes para não ser confundido com um bug de produção.
test.beforeEach(async ({ page }) => {
  // addInitScript (não addStyleTag) para sobreviver aos vários page.goto()
  // de cada teste — addStyleTag some assim que o documento troca.
  await page.addInitScript(() => {
    const style = document.createElement("style")
    style.textContent =
      '[data-testid="viewport-simulator"] { display: none !important; }'
    document.addEventListener("DOMContentLoaded", () =>
      document.head.appendChild(style)
    )
  })
})

const BACKEND_URL = "http://localhost:9000"
const ANCHOR_HANDLE = "vestido-midi-canelado-lovito-gola-alta"
const ANCHOR_TITLE = "Vestido Midi Canelado Lovito Gola Alta Elegante Outono Inverno"
const ADMIN_EMAIL = "admin@eco.local"
const ADMIN_PASSWORD = "Admin123!"

async function gridColumnCount(page: Page, headingText: string) {
  const grid = page
    .getByRole("heading", { name: headingText })
    .locator("xpath=following-sibling::div[1]//div[contains(concat(' ', @class, ' '), ' grid ')]")
    .first()
  const columns = await grid.evaluate((el) => {
    const style = window.getComputedStyle(el)
    return style.gridTemplateColumns.split(" ").filter(Boolean).length
  })
  return columns
}

test.describe("Teste 1 — Fidelidade Visual Desktop (1200x800)", () => {
  test.use({ viewport: { width: 1200, height: 800 } })

  test("header com gradiente sticky, Ofertas Relâmpago ativo, grade 6 colunas", async ({
    page,
  }) => {
    await page.goto("/")

    const header = page.locator("header")
    await expect(header).toHaveClass(/sticky/)
    const desktopBar = header.locator(".bg-header-gradient")
    await expect(desktopBar).toBeVisible()

    await expect(page.getByRole("heading", { name: "⚡ Ofertas Relâmpago" })).toBeVisible()
    // Cronômetro HH:MM:SS em caixas pretas
    await expect(page.locator("text=/^[0-9]{2}$/").first()).toBeVisible()

    const columns = await gridColumnCount(page, "Descobertas do Dia")
    expect(columns).toBe(6)
  })
})

test.describe("Teste 2 — Fidelidade Responsiva Mobile (375x812)", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test("grade 2 colunas, bottom nav 5 abas, PDP abre bottom sheet", async ({ page }) => {
    await page.goto("/")

    const columns = await gridColumnCount(page, "Descobertas do Dia")
    expect(columns).toBe(2)

    const bottomNav = page.locator("nav.fixed.bottom-0")
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.locator("a, button")).toHaveCount(5)

    await page.goto(`/produto/${ANCHOR_HANDLE}`)
    await page.getByRole("button", { name: "Adicionar", exact: true }).click()
    await expect(page.getByTestId("bottom-sheet-drawer")).toBeVisible()
  })
})

test("Teste 3 — Jornada completa de compra até o Pix", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  test.setTimeout(60_000)

  await page.goto("/")
  await page
    .getByRole("link", { name: new RegExp(ANCHOR_TITLE.slice(0, 20)) })
    .first()
    .click()
  await expect(page).toHaveURL(new RegExp(`/produto/${ANCHOR_HANDLE}`))

  await page.getByTestId("option-Cor-Bege").click()
  await page.getByTestId("option-Tamanho-M").click()
  await expect(page.locator(".check-triangle")).toHaveCount(2)

  await page.getByRole("button", { name: "Adicionar ao Carrinho" }).click()
  await expect(page.getByText("O produto foi adicionado ao seu carrinho!")).toBeVisible()

  await page.goto("/cart")
  await expect(page.getByText(/Ativo ✓/)).toBeVisible() // frete grátis já ligado por padrão
  await page.getByText("Moedas — Saldo:").locator("xpath=following-sibling::input").click()
  await expect(page.getByText("R$ 44,44", { exact: false })).toBeVisible()

  await page.getByRole("button", { name: "Finalizar Compra" }).click()
  await expect(page).toHaveURL(/\/checkout/)

  await page.getByRole("button", { name: /PIX \(10% OFF EXTRA\)/ }).click()
  await expect(page.getByText("R$ 39,05")).toBeVisible()

  await page.getByRole("button", { name: /Fazer Pedido/ }).click()
  await expect(page).toHaveURL(/\/pedido\/.+\/sucesso/, { timeout: 20_000 })

  const canvas = page.locator("canvas")
  await expect(canvas).toBeVisible()

  await page.getByRole("button", { name: "Copiar" }).click()
  await expect(page.getByText(/Copia e Cola copiado/)).toBeVisible()
})

test("Teste 4 — Sincronização do PDV físico", async ({ page, request }) => {
  const authResponse = await request.post(`${BACKEND_URL}/auth/user/emailpass`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  expect(authResponse.ok()).toBeTruthy()
  const { token } = await authResponse.json()

  const sku = "VESTIDO-MIDI-LOVITO-TER-P" // Terracota / P — não usado nos outros testes
  const lookupBefore = await request.get(
    `${BACKEND_URL}/admin/pdv/lookup?sku=${sku}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const before = await lookupBefore.json()

  await page.goto(`/produto/${ANCHOR_HANDLE}`)
  await page.getByTestId("option-Cor-Terracota").click()
  await page.getByTestId("option-Tamanho-P").click()
  const stockTextBefore = await page.getByText(/em estoque$/).first().innerText()
  expect(stockTextBefore).toContain(String(before.available_quantity))

  const checkoutResponse = await request.post(`${BACKEND_URL}/admin/pdv/checkout`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: {
      items: [
        {
          variant_id: before.variant_id,
          sku,
          quantity: 1,
          unit_price: before.unit_price,
        },
      ],
      payment_method: "pix",
    },
  })
  expect(checkoutResponse.ok()).toBeTruthy()

  await page.reload()
  await page.getByTestId("option-Cor-Terracota").click()
  await page.getByTestId("option-Tamanho-P").click()
  const stockTextAfter = await page.getByText(/em estoque$/).first().innerText()
  expect(stockTextAfter).toContain(String(before.available_quantity - 1))
})
