import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { FRANCHISE_HYPERLOCAL_MODULE } from "../modules/franchise-hyperlocal"

/**
 * Seed BR data for the white-label hyperlocal marketplace engine (Fase 1 /
 * @BackendMedusa). Additive: runs alongside Medusa's own scaffolded
 * EU demo seed, it does not remove it.
 *
 * Run with: npm run seed
 */
export default async function seedBr({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const storeModuleService = container.resolve(Modules.STORE)

  logger.info("[br] Seeding region Brasil (BRL)...")
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Brasil",
          currency_code: "brl",
          countries: ["br"],
          payment_providers: [
            "pp_system_default",
            "pp_mercadopago-br_pix_br",
            "pp_mercadopago-br_card_br",
            "pp_mercadopago-br_boleto_br",
            "pp_pagarme-br_pix_br",
            "pp_pagarme-br_card_br",
            "pp_pagarme-br_boleto_br",
          ],
        },
      ],
    },
  })
  const region = regionResult[0]

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: "br", provider_id: "tp_system" }],
  })

  const { data: storeRows } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  })
  const store = storeRows[0]
  const existingCurrencies = (store.supported_currencies || []).map(
    (c: any) => c.currency_code
  )
  if (!existingCurrencies.includes("brl")) {
    await storeModuleService.updateStores(store.id, {
      supported_currencies: [
        ...(store.supported_currencies || []).map((c: any) => ({
          currency_code: c.currency_code,
          is_default: c.is_default,
        })),
        { currency_code: "brl", is_default: false },
      ],
    })
  }

  logger.info("[br] Seeding stock locations (Matriz PDV + CD Franqueado)...")
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Loja Física Matriz (Ponto Físico / PDV)",
          address: {
            city: "São Paulo",
            country_code: "BR",
            province: "SP",
            postal_code: "01310-100",
            address_1: "Av. Paulista, 1000",
          },
        },
        {
          name: "CD Franqueado Exemplo (Operação Hiperlocal Cidade)",
          address: {
            city: "Campinas",
            country_code: "BR",
            province: "SP",
            postal_code: "13010-001",
            address_1: "Rua das Franquias, 500",
          },
        },
      ],
    },
  })
  const [matrizLocation, franqueadoLocation] = stockLocationResult

  for (const loc of [matrizLocation, franqueadoLocation]) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: loc.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
  }

  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfileResult[0]

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Brasil delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Brasil",
        geo_zones: [{ country_code: "br", type: "country" }],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: matrizLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Envio Padrão (Transportadora / Correios)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Padrão",
          description: "Entrega em 3 a 7 dias úteis.",
          code: "standard_br",
        },
        prices: [{ region_id: region.id, amount: 1490 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Entrega Expressa na Sua Cidade (Motoboy / Franqueado Local)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Expressa Hiperlocal",
          description: "Motoboy local, mesma cidade de um Stock Location ativo.",
          code: "express_hyperlocal_br",
        },
        prices: [{ region_id: region.id, amount: 990 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  logger.info("[br] Seeding sales channels (E-commerce + PDV)...")
  const { result: salesChannelResult } = await createSalesChannelsWorkflow(
    container
  ).run({
    input: {
      salesChannelsData: [
        {
          name: "E-commerce Web & Mobile (Storefront)",
          description: "Canal de venda online white-label",
        },
        {
          name: "PDV Ponto Físico (Balcão)",
          description: "Canal de venda do balcão físico / franqueados",
        },
      ],
    },
  })
  const [ecommerceChannel, pdvChannel] = salesChannelResult

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: matrizLocation.id, add: [ecommerceChannel.id, pdvChannel.id] },
  })
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: franqueadoLocation.id, add: [ecommerceChannel.id] },
  })

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Storefront BR API Key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  })
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [ecommerceChannel.id] },
  })
  logger.info(`[br] Publishable API key: ${publishableApiKey.token}`)

  logger.info("[br] Seeding product categories...")
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        { name: "Moda Feminina", is_active: true },
        { name: "Moda Masculina", is_active: true },
        { name: "Eletrônicos", is_active: true },
        { name: "Casa e Decoração", is_active: true },
        { name: "Beleza e Cuidados", is_active: true },
      ],
    },
  })
  const catId = (name: string) =>
    categoryResult.find((c) => c.name === name)!.id

  logger.info("[br] Seeding products (PT-BR)...")

  // Produto âncora: variações de Cor x Tamanho, com G esgotado.
  const cores = ["Preto", "Bege", "Terracota"]
  const tamanhos = ["P", "M", "G"]
  const anchorVariants = cores.flatMap((cor) =>
    tamanhos.map((tamanho) => ({
      title: `${cor} / ${tamanho}`,
      sku: `VESTIDO-MIDI-LOVITO-${cor.slice(0, 3).toUpperCase()}-${tamanho}`,
      options: { Cor: cor, Tamanho: tamanho },
      prices: [{ amount: 5394, currency_code: "brl" }],
    }))
  )

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title:
            "Vestido Midi Canelado Lovito Gola Alta Elegante Outono Inverno",
          category_ids: [catId("Moda Feminina")],
          description:
            "Vestido midi canelado, gola alta, elegante para outono/inverno. De R$ 89,90 por R$ 53,94.",
          handle: "vestido-midi-canelado-lovito-gola-alta",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: { original_price_cents: 8990, sale_price_cents: 5394 },
          images: [
            {
              url: "/images/products/prod-01-main.jpg",
            },
          ],
          options: [
            { title: "Cor", values: cores },
            { title: "Tamanho", values: tamanhos },
          ],
          variants: anchorVariants,
          sales_channels: [{ id: ecommerceChannel.id }, { id: pdvChannel.id }],
        },
        ...buildSimpleProduct({
          title: "Blusa Cropped Canelada Manga Longa Feminina",
          handle: "blusa-cropped-canelada-manga-longa",
          category_id: catId("Moda Feminina"),
          priceCents: 3990,
          sku: "BLUSA-CROPPED-CANELADA",
          channelIds: [ecommerceChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Camiseta Básica Algodão Premium Masculina",
          handle: "camiseta-basica-algodao-premium",
          category_id: catId("Moda Masculina"),
          priceCents: 2990,
          sku: "CAMISETA-BASICA-ALGODAO",
          channelIds: [ecommerceChannel.id, pdvChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Bermuda Jeans Masculina Slim",
          handle: "bermuda-jeans-masculina-slim",
          category_id: catId("Moda Masculina"),
          priceCents: 7990,
          sku: "BERMUDA-JEANS-SLIM",
          channelIds: [ecommerceChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Fone de Ouvido Bluetooth TWS com Case Carregador",
          handle: "fone-ouvido-bluetooth-tws-case",
          category_id: catId("Eletrônicos"),
          priceCents: 5990,
          sku: "FONE-TWS-CASE",
          channelIds: [ecommerceChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Carregador Turbo 33W USB-C com Cabo",
          handle: "carregador-turbo-33w-usb-c",
          category_id: catId("Eletrônicos"),
          priceCents: 4490,
          sku: "CARREGADOR-TURBO-33W",
          channelIds: [ecommerceChannel.id, pdvChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Smartwatch Esportivo Tela AMOLED à Prova D'água",
          handle: "smartwatch-esportivo-amoled",
          category_id: catId("Eletrônicos"),
          priceCents: 12990,
          sku: "SMARTWATCH-AMOLED",
          channelIds: [ecommerceChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Luminária de Mesa LED Touch Dimerizável",
          handle: "luminaria-mesa-led-touch",
          category_id: catId("Casa e Decoração"),
          priceCents: 3490,
          sku: "LUMINARIA-LED-TOUCH",
          channelIds: [ecommerceChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Organizador de Gavetas Multiuso 6 Divisórias",
          handle: "organizador-gavetas-multiuso",
          category_id: catId("Casa e Decoração"),
          priceCents: 2490,
          sku: "ORGANIZADOR-GAVETAS-6",
          channelIds: [ecommerceChannel.id, pdvChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Jogo de Panelas Antiaderente 5 Peças",
          handle: "jogo-panelas-antiaderente-5pcs",
          category_id: catId("Casa e Decoração"),
          priceCents: 18990,
          sku: "PANELAS-ANTIADERENTE-5PC",
          channelIds: [ecommerceChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Kit Skincare Facial Vitamina C 3 Produtos",
          handle: "kit-skincare-facial-vitamina-c",
          category_id: catId("Beleza e Cuidados"),
          priceCents: 8990,
          sku: "SKINCARE-VITC-KIT3",
          channelIds: [ecommerceChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
        ...buildSimpleProduct({
          title: "Secador de Cabelo Profissional Íon 2000W",
          handle: "secador-cabelo-profissional-ion-2000w",
          category_id: catId("Beleza e Cuidados"),
          priceCents: 9990,
          sku: "SECADOR-ION-2000W",
          channelIds: [ecommerceChannel.id, pdvChannel.id],
          shippingProfileId: shippingProfile.id,
        }),
      ],
    },
  })
  logger.info("[br] Finished seeding products.")

  logger.info("[br] Seeding inventory levels...")
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "inventory_items.inventory_item_id"],
  })

  const inventoryLevels: {
    location_id: string
    stocked_quantity: number
    inventory_item_id: string
  }[] = []

  for (const variant of variants) {
    const isAnchorG = variant.sku?.endsWith("-G")
    for (const item of variant.inventory_items || []) {
      if (!item) continue
      inventoryLevels.push({
        location_id: matrizLocation.id,
        stocked_quantity: isAnchorG ? 0 : 150,
        inventory_item_id: item.inventory_item_id,
      })
    }
  }

  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: inventoryLevels },
  })

  logger.info("[br] Seeding franchise units (hiperlocal)...")
  const franchiseHyperlocalService = container.resolve(FRANCHISE_HYPERLOCAL_MODULE)
  await franchiseHyperlocalService.createFranchiseUnits([
    {
      name: "Unidade Matriz (São Paulo Capital)",
      city: "São Paulo",
      state: "SP",
      cep_prefix_start: "01000000",
      cep_prefix_end: "01999999",
      stock_location_id: matrizLocation.id,
      recipient_pagarme_id: null,
      commission_rate: 0,
    },
    {
      name: "Unidade Campinas (Franqueado Exemplo)",
      city: "Campinas",
      state: "SP",
      cep_prefix_start: "13000000",
      cep_prefix_end: "13999999",
      stock_location_id: franqueadoLocation.id,
      recipient_pagarme_id: "acc_test_campinas_franqueado",
      commission_rate: 15,
    },
  ])

  logger.info("[br] Seed completo. Produtos, região Brasil (BRL), locais e canais criados.")
}

function buildSimpleProduct(opts: {
  title: string
  handle: string
  category_id: string
  priceCents: number
  sku: string
  channelIds: string[]
  shippingProfileId: string
}) {
  return [
    {
      title: opts.title,
      handle: opts.handle,
      category_ids: [opts.category_id],
      description: opts.title,
      weight: 300,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: opts.shippingProfileId,
      options: [{ title: "Padrão", values: ["Único"] }],
      variants: [
        {
          title: "Padrão",
          sku: opts.sku,
          options: { Padrão: "Único" },
          prices: [{ amount: opts.priceCents, currency_code: "brl" }],
        },
      ],
      sales_channels: opts.channelIds.map((id) => ({ id })),
    },
  ]
}
