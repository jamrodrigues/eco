import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Catálogo âncora da branch brand/vruumoto (Fase 5, doc seção 4).
 *
 * Cria um Sales Channel dedicado ("Vruumoto — Peças de Moto") em vez de
 * reaproveitar o canal "E-commerce Web & Mobile (Storefront)" da
 * EcoShop: este sandbox roda as duas marcas no mesmo Postgres, então
 * sem um canal próprio o storefront da Vruumoto mostraria vestidos e
 * eletrônicos junto com peça de moto. Região e Stock Location (Loja
 * Física Matriz) são reaproveitados da Fase 1 — não há necessidade de
 * duplicar infraestrutura de frete/estoque só por causa da marca.
 *
 * Run com: npx medusa exec ./src/scripts/seed-vruumoto.ts
 */

const REGION_ID = "reg_01M5N34A51B7AM2P1K7TZM9E43"
const MATRIZ_LOCATION_ID = "sloc_01M5N34AHR0EA7FCT9W40HQ52R"
const SHIPPING_PROFILE_ID = "sp_01M5N2ZMQVDHMJFNAA9N7SVW1E"

export default async function seedVruumoto({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existingChannel } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: "Vruumoto — Peças de Moto" },
  })
  if (existingChannel.length) {
    logger.info("[vruumoto] Sales channel já existe, seed já rodou. Pulando.")
    return
  }

  logger.info("[vruumoto] Criando Sales Channel dedicado...")
  const {
    result: [vruumotoChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Vruumoto — Peças de Moto",
          description: "Canal de venda white-label da marca Vruumoto (branch brand/vruumoto)",
        },
      ],
    },
  })

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: MATRIZ_LOCATION_ID, add: [vruumotoChannel.id] },
  })

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        { title: "Vruumoto Storefront API Key", type: "publishable", created_by: "" },
      ],
    },
  })
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [vruumotoChannel.id] },
  })
  logger.info(`[vruumoto] Publishable API key: ${publishableApiKey.token}`)
  logger.info(`[vruumoto] Sales channel id: ${vruumotoChannel.id}`)

  logger.info("[vruumoto] Criando categorias...")
  const { result: categories } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        { name: "Motor", is_active: true },
        { name: "Capacetes & Jaquetas", is_active: true },
        { name: "Pneus & Câmaras", is_active: true },
        { name: "Óleos & Filtros", is_active: true },
      ],
    },
  })
  const catId = (name: string) => categories.find((c) => c.name === name)!.id

  logger.info("[vruumoto] Criando produtos âncora...")
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Kit Relação Transmissão Aço 1045 com Retentor O-Ring Vruumoto Original",
          handle: "kit-relacao-transmissao-aco-1045-vruumoto-original",
          category_ids: [catId("Motor")],
          description:
            "Kit relação (coroa + pinhão + corrente) em aço 1045 com retentor O-Ring, alta durabilidade pra uso urbano e motoboy. De R$ 189,90 por R$ 113,94.",
          weight: 1200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: SHIPPING_PROFILE_ID,
          metadata: { original_price_cents: 18990, sale_price_cents: 11394 },
          images: [{ url: "/images/vruumoto/kit-relacao-freio.jpg" }],
          options: [
            {
              title: "Aplicação",
              values: [
                "Honda CG 160 Titan/Fan/Start (2016-2026)",
                "Honda NXR 160 Bros / XRE 190",
                "Yamaha Fazer 250 / Lander 250",
                "Honda CB 300F Twister",
              ],
            },
          ],
          variants: [
            {
              title: "Honda CG 160 Titan/Fan/Start (2016-2026)",
              sku: "KIT-RELACAO-1045-CG160",
              options: { Aplicação: "Honda CG 160 Titan/Fan/Start (2016-2026)" },
              prices: [{ amount: 11394, currency_code: "brl" }],
              metadata: {
                oem_part_number: "06410-KVS-J00",
                ean_barcode: "7891234567001",
                viscosity_or_spec: "Aço 1045 com Retentor O-Ring",
                compatible_motorcycles: [
                  { make: "Honda", model: "CG 160 Titan", year_start: 2016, year_end: 2026 },
                  { make: "Honda", model: "CG 160 Fan", year_start: 2016, year_end: 2026 },
                  { make: "Honda", model: "CG 160 Start", year_start: 2016, year_end: 2026 },
                ],
              },
            },
            {
              title: "Honda NXR 160 Bros / XRE 190",
              sku: "KIT-RELACAO-1045-NXR160",
              options: { Aplicação: "Honda NXR 160 Bros / XRE 190" },
              prices: [{ amount: 11394, currency_code: "brl" }],
              metadata: {
                oem_part_number: "KM-9182",
                ean_barcode: "7891234567002",
                viscosity_or_spec: "Aço 1045 com Retentor O-Ring",
                compatible_motorcycles: [
                  { make: "Honda", model: "NXR 160 Bros", year_start: 2016, year_end: 2026 },
                ],
              },
            },
            {
              title: "Yamaha Fazer 250 / Lander 250",
              sku: "KIT-RELACAO-1045-FAZER250",
              options: { Aplicação: "Yamaha Fazer 250 / Lander 250" },
              prices: [{ amount: 11394, currency_code: "brl" }],
              metadata: {
                oem_part_number: "YAM-REL-250",
                ean_barcode: "7891234567003",
                viscosity_or_spec: "Aço 1045 com Retentor O-Ring",
                compatible_motorcycles: [
                  { make: "Yamaha", model: "Fazer 250", year_start: 2015, year_end: 2026 },
                  { make: "Yamaha", model: "Lander 250", year_start: 2015, year_end: 2026 },
                ],
              },
            },
            {
              title: "Honda CB 300F Twister",
              sku: "KIT-RELACAO-1045-CB300",
              options: { Aplicação: "Honda CB 300F Twister" },
              prices: [{ amount: 11394, currency_code: "brl" }],
              metadata: {
                oem_part_number: "HON-REL-300TW",
                ean_barcode: "7891234567004",
                viscosity_or_spec: "Aço 1045 com Retentor O-Ring",
                compatible_motorcycles: [
                  { make: "Honda", model: "CB 300F Twister", year_start: 2018, year_end: 2026 },
                ],
              },
            },
          ],
          sales_channels: [{ id: vruumotoChannel.id }],
        },
        {
          title: "Capacete Fechado Aerodinâmico Viseira Solar Interna Dupla Vruumoto Pro",
          handle: "capacete-fechado-aerodinamico-viseira-solar-vruumoto-pro",
          category_ids: [catId("Capacetes & Jaquetas")],
          description:
            "Capacete fechado aerodinâmico com viseira solar interna dupla, certificação INMETRO.",
          weight: 1500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: SHIPPING_PROFILE_ID,
          options: [
            { title: "Cor", values: ["Preto Fosco", "Vermelho Racing", "Grafite Titanium"] },
            { title: "Tamanho", values: ["56", "58", "60", "62"] },
          ],
          variants: ["Preto Fosco", "Vermelho Racing", "Grafite Titanium"].flatMap((cor) =>
            ["56", "58", "60", "62"].map((tam) => ({
              title: `${cor} / ${tam}`,
              sku: `CAPACETE-PRO-${cor.slice(0, 3).toUpperCase()}-${tam}`,
              options: { Cor: cor, Tamanho: tam },
              prices: [{ amount: 34990, currency_code: "brl" }],
            }))
          ),
          sales_channels: [{ id: vruumotoChannel.id }],
        },
        {
          title: "Pneu Traseiro 90/90-18 Sem Câmara Alta Durabilidade Urbano/Motoboy",
          handle: "pneu-traseiro-90-90-18-sem-camara-urbano-motoboy",
          category_ids: [catId("Pneus & Câmaras")],
          description: "Pneu traseiro 90/90-18 sem câmara, alta durabilidade pra uso urbano e motoboy.",
          weight: 3500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: SHIPPING_PROFILE_ID,
          options: [{ title: "Padrão", values: ["Único"] }],
          variants: [
            {
              title: "Padrão",
              sku: "PNEU-TRAS-90-90-18",
              options: { Padrão: "Único" },
              prices: [{ amount: 21990, currency_code: "brl" }],
              metadata: { viscosity_or_spec: "90/90-18 Sem Câmara" },
            },
          ],
          sales_channels: [{ id: vruumotoChannel.id }],
        },
        {
          title: "Kit 4 Litros Óleo Motor 10W30 Semissintético 4T + Filtro de Óleo",
          handle: "kit-4-litros-oleo-motor-10w30-semissintetico-4t-filtro",
          category_ids: [catId("Óleos & Filtros")],
          description: "Kit com 4 litros de óleo de motor 10W30 semissintético 4T + filtro de óleo.",
          weight: 4200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: SHIPPING_PROFILE_ID,
          options: [{ title: "Padrão", values: ["Único"] }],
          variants: [
            {
              title: "Padrão",
              sku: "KIT-OLEO-10W30-4L-FILTRO",
              options: { Padrão: "Único" },
              prices: [{ amount: 8990, currency_code: "brl" }],
              metadata: { viscosity_or_spec: "10W30 Semissintético" },
            },
          ],
          sales_channels: [{ id: vruumotoChannel.id }],
        },
      ],
    },
  })
  logger.info("[vruumoto] Produtos criados.")

  logger.info("[vruumoto] Seedando estoque na Matriz...")
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "inventory_items.inventory_item_id"],
    filters: {
      sku: [
        "KIT-RELACAO-1045-CG160",
        "KIT-RELACAO-1045-NXR160",
        "KIT-RELACAO-1045-FAZER250",
        "KIT-RELACAO-1045-CB300",
        "PNEU-TRAS-90-90-18",
        "KIT-OLEO-10W30-4L-FILTRO",
      ],
    },
  })

  const stockBySku: Record<string, number> = {
    "KIT-RELACAO-1045-CG160": 85,
    "KIT-RELACAO-1045-NXR160": 42,
    "KIT-RELACAO-1045-FAZER250": 19,
    "KIT-RELACAO-1045-CB300": 0, // esgotado — demonstra o estado bloqueado na PDP
    "PNEU-TRAS-90-90-18": 60,
    "KIT-OLEO-10W30-4L-FILTRO": 120,
  }

  const { data: helmetVariants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "inventory_items.inventory_item_id"],
    filters: { sku: { $like: "CAPACETE-PRO-%" } },
  })

  const inventoryLevels: { location_id: string; stocked_quantity: number; inventory_item_id: string }[] = []

  for (const v of variants as any[]) {
    const qty = stockBySku[v.sku] ?? 0
    for (const item of v.inventory_items || []) {
      inventoryLevels.push({
        location_id: MATRIZ_LOCATION_ID,
        stocked_quantity: qty,
        inventory_item_id: item.inventory_item_id,
      })
    }
  }
  for (const v of helmetVariants as any[]) {
    for (const item of v.inventory_items || []) {
      inventoryLevels.push({
        location_id: MATRIZ_LOCATION_ID,
        stocked_quantity: 30,
        inventory_item_id: item.inventory_item_id,
      })
    }
  }

  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: inventoryLevels },
  })

  logger.info("[vruumoto] Seed completo.")
}
