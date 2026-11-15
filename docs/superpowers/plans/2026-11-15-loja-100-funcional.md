# Loja 100% funcional — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar todo elemento mock do storefront Vruumoto por dado/integração real (busca, estoque, ficha técnica, vendidos, avaliações moderadas, ofertas relâmpago por price list, carrossel admin, instalar PWA) e remover o que foi decidido remover.

**Architecture:** Storefront Next 15 (server components buscam no Medusa via `src/lib/medusa.ts`; client components só onde há estado). Backend Medusa 2.21: cada feature nova é um módulo custom no padrão de `src/modules/institutional-pages` (model + migration + service) com rotas em `src/api/store|admin` e página admin em `src/admin/routes`. Contadores e resumos derivados (vendidos, média de avaliações) são gravados em `product.metadata` por subscriber/rota, pra listagem não fazer N+1.

**Tech Stack:** Next 15.5 / React 19 / Tailwind 3 / `qrcode` (já instalado); Medusa 2.21.2 (`@medusajs/framework`), jest 29 (`npm run test:unit` no backend). Storefront não tem test runner unitário — verificação é `npx tsc --noEmit` + `npm run lint` + checagem manual/`curl`.

**Spec:** `docs/superpowers/specs/2026-11-15-loja-100-funcional-design.md`

## Global Constraints

- Branch `brand/vruumoto`; git neste disco: `git -c safe.directory='*' <cmd>`.
- Caminhos: storefront `platform/apps/storefront`, backend `platform/apps/backend` (raiz do repo: `/media/jameson/C08AAF748AAF659E/xampp/htdocs/eco`).
- Nunca número inventado: nota/contagem/vendidos ocultos sem dado. Mínimo pra exibir "vendidos": `MIN_SOLD_TO_SHOW = 5`.
- Texto de UI em pt-BR. Commits `feat|fix|chore(storefront|backend): ...`.
- Toda rota `/admin/<x>` nova entra em `PREFIX_MAP` de `backend/src/modules/access-control/permissions.ts` com uma `PermissionCategory`.
- Toda rota `/store/*` nova que exige cliente logado entra em `backend/src/api/middlewares.ts` com `authenticate('customer', ['bearer'])`.
- Banner usa `image_url` (texto); sem upload nesta fase.
- Push em `brand/vruumoto` = deploy no demo. Depois de cada PR com backend, confirmar no demo com `curl` (backend demora ~7 min pra subir).
- Verificação padrão storefront: `cd platform/apps/storefront && npx tsc --noEmit && npm run lint` (lint tem 3 erros pré-existentes não relacionados — só não pode aumentar).
- Verificação padrão backend: `cd platform/apps/backend && npm run test:unit && npm run build`.

## Review Focus

1. Busca com `q` vazio ou só espaços → `/busca` mostra a grade completa com título "Todos os produtos", não erro (Task 1 testa).
2. Produto sem nenhuma avaliação e sem `sold_count` → PDP e card não mostram linha de nota/vendidos, sem "0 avaliações" nem "undefined" (Tasks 3 e 14).
3. Price list ativa mas com `ends_at` já passado (admin esqueceu de desativar) → `/store/flash-sale` responde `active: false` e a seção some (Task 8 testa).
4. Cliente tenta avaliar duas vezes o mesmo produto → 409, e avaliação `pending` nunca aparece em `GET /store/products/:id/reviews` (Task 12 testa).
5. Banner com `starts_at` no futuro ou `active: false` → não vem em `GET /store/banners`; zero banners → `HeroBanner` cai no banner estático atual (Tasks 15 e 16).

---

## PR 1 — Busca, navegação, cards honestos, ficha técnica, PWA (só storefront)

### Task 1: Busca real

**Files:**
- Modify: `platform/apps/storefront/src/lib/medusa.ts:78-93` (`listProducts`), tipo `MedusaProduct` (linha 7)
- Create: `platform/apps/storefront/app/busca/page.tsx`
- Modify: `platform/apps/storefront/src/components/ProductGrid.tsx`
- Modify: `platform/apps/storefront/src/components/Header.tsx:100-112` (desktop) e `:134-140` (mobile)

**Interfaces:**
- Produces: `listProducts(opts: { limit?: number; offset?: number; q?: string; categoryId?: string; ids?: string[] })` — adiciona `q`, `category_id[]` e `id[]` à query string só quando definidos (todos nativos de `GET /store/products`). `fields` passa a ser `"id,title,handle,thumbnail,metadata,*variants,variants.calculated_price,variants.inventory_quantity"`.
- Produces: `MedusaProduct.metadata?: { sold_count?: number; review_count?: number; review_avg?: number } | null` e `MedusaProduct.variants[].inventory_quantity?: number`.
- Produces: `getCategoryByHandle(handle: string): Promise<{ id: string; name: string; handle: string } | null>` via `GET /store/product-categories?handle=<handle>&fields=id,name,handle`.
- Produces: `ProductGrid` aceita `query?: string` e `categoryId?: string` e os repassa em `loadMore`.

- [ ] **Step 1: Estender `listProducts` e tipos em `medusa.ts`** conforme Interfaces. `URLSearchParams` com `params.append("category_id[]", categoryId)` e `ids.forEach(id => params.append("id[]", id))`.
- [ ] **Step 2: Criar `getCategoryByHandle`** no mesmo arquivo (retorna `null` se a lista vier vazia).
- [ ] **Step 3: `ProductGrid`** — novas props opcionais `query`, `categoryId`; `loadMore` chama `listProducts({ limit: PAGE_SIZE, offset, q: query, categoryId })`; incluir `query`/`categoryId` nas deps do `useCallback`.
- [ ] **Step 4: Criar `app/busca/page.tsx`** (server component, `export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string }> })`). Regras: `q = (q ?? "").trim()`; se `categoria` → `getCategoryByHandle`; chama `listProducts({ limit: 24, q: q || undefined, categoryId: cat?.id })`. Título: categoria → nome da categoria; `q` → `Resultados para “{q}”`; nenhum → `Todos os produtos`. Zero resultados → `<p>Nenhum produto encontrado.</p>` + link "Ver todos os produtos" (`/busca`). Renderiza `<Header />`, título, `<ProductGrid initialProducts initialCount query={q || undefined} categoryId={cat?.id} />`, `<Footer />`, `<BottomNav />` (mesma composição de `app/page.tsx`).
- [ ] **Step 5: Header** — envolver cada barra (desktop e mobile) em `<form action="/busca" method="get" role="search">`; `<input name="q" type="search" defaultValue={initialQuery}>`; botão desktop vira `type="submit"`. Como `Header` é client component sem acesso a `searchParams`, ler `initialQuery` com `useSearchParams().get("q") ?? ""` (importar de `next/navigation`; `Header` já é `"use client"` — confirmar; se o `useSearchParams` exigir `Suspense`, envolver só o form num `<Suspense fallback={null}>`).
- [ ] **Step 6: Verificar** — `npx tsc --noEmit && npm run lint`; `npm run dev` e abrir `http://localhost:3000/busca?q=kit`, `/busca?q=%20%20` (título "Todos os produtos"), `/busca?categoria=<handle real>` (pegar handles em `curl -s "https://api.vruumoto.com.br/store/product-categories?fields=id,name,handle" -H "x-publishable-api-key: $NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"`), digitar no header e dar Enter → navega pra `/busca?q=...`.
- [ ] **Step 7: Commit** — `feat(storefront): busca real por texto e categoria (/busca) ligada ao header`

### Task 2: Atalhos com link, menu mobile útil, páginas placeholder fora

**Files:**
- Modify: `platform/apps/storefront/src/config/brand.config.ts` (tipo `serviceShortcuts` linha 27 e valores linhas 61-67)
- Modify: `platform/apps/storefront/src/components/ServiceShortcuts.tsx`
- Modify: `platform/apps/storefront/src/components/BottomNav.tsx:4-9`
- Modify: `platform/apps/storefront/src/components/PdpClient.tsx:237-242` (link `/chat` da barra mobile)
- Delete: `platform/apps/storefront/app/video/page.tsx`, `app/live/page.tsx`, `app/notificacoes/page.tsx`, `app/chat/page.tsx`

**Interfaces:**
- Produces: `BrandConfig.serviceShortcuts?: { icon: string; label: string; href: string }[]`.

- [ ] **Step 1: `brand.config.ts`** — adicionar `href` ao tipo e aos 6 itens: Kit Relação → `/busca?q=kit%20rela%C3%A7%C3%A3o`; Pneus & Câmaras → `/busca?categoria=<handle>`; Capacetes & Jaquetas → `/busca?categoria=<handle>`; Óleos & Filtros → `/busca?categoria=<handle>`; Freios → `/busca?q=freio`; Entrega Expressa Motoboy → `/institucional/entrega`. Handles reais: `curl` do Step 6 da Task 1 (não chutar).
- [ ] **Step 2: `ServiceShortcuts.tsx`** — `defaultItems` ganham `href` (Moedas → `/conta?tab=moedas`, Cupons → `/institucional/pagamento`, Frete Grátis → `/institucional/entrega`, Ofertas Relâmpago → `/#ofertas`, Lojas Oficiais → `/busca`); trocar o `<div ... cursor-pointer>` por `<Link href={item.href}>` com as mesmas classes. Se `/conta` não ler `?tab=`, abrir o `app/conta/page.tsx:104` e inicializar o `useState<Tab>` a partir de `useSearchParams().get("tab")` quando for um valor válido.
- [ ] **Step 3: `BottomNav.tsx`** — tabs: `{home,"Início","/"}`, `{search,"Busca","/busca"}`, `{shopping_cart,"Carrinho","/cart"}`, `{account_circle,"Eu","/conta"}`.
- [ ] **Step 4: `PdpClient.tsx`** — o `<a href="/chat">` da barra mobile vira `<a href="/institucional/central-de-ajuda">` com ícone `help`.
- [ ] **Step 5: Apagar** as 4 páginas placeholder; `grep -rn "/video\|/live\|/notificacoes\|/chat" app src` deve retornar zero links.
- [ ] **Step 6: Verificar** — `npx tsc --noEmit && npm run lint`; no mobile (DevTools 375px) as 4 abas navegam; cada atalho da home abre a busca certa; `/institucional/entrega` e `/institucional/central-de-ajuda` respondem 200.
- [ ] **Step 7: Commit** — `feat(storefront): atalhos e menu mobile com destinos reais; remove paginas placeholder`

### Task 3: Cards e PDP honestos (badges, vendidos, vendedor)

**Files:**
- Modify: `platform/apps/storefront/src/config/brand.config.ts` (`features`)
- Modify: `platform/apps/storefront/src/components/ProductCard.tsx`
- Modify: `platform/apps/storefront/src/components/PdpClient.tsx:19,30,117-126,230`
- Delete: `platform/apps/storefront/src/components/SellerCard.tsx`
- Modify: `platform/apps/storefront/src/lib/medusa.ts` (remover `deterministicInRange`; `FlashSaleSection` ainda usa — ver Step 5)
- Create: `platform/apps/storefront/src/lib/social-proof.ts`

**Interfaces:**
- Produces: `BrandConfig.features.showOfficialBadge: boolean` (valor `false`).
- Produces: em `src/lib/social-proof.ts`: `MIN_SOLD_TO_SHOW = 5`; `formatSoldLabel(soldCount: number | undefined): string | null` (retorna `null` abaixo do mínimo; `"12 vendidos"` até 999; `"1,2 mil vendidos"` a partir de 1000); `formatRatingLabel(avg: number | undefined, count: number | undefined): string | null` (`null` se `!count`; senão `"4,8 ★ (12 avaliações)"`, 1 → `"(1 avaliação)"`); `discountPercent(calculated: number, original: number | undefined): number` (0 se não há original maior).

- [ ] **Step 1: `brand.config.ts`** — adicionar `showOfficialBadge: boolean` ao tipo e `showOfficialBadge: false` ao valor.
- [ ] **Step 2: Criar `src/lib/social-proof.ts`** com as 3 funções acima e a constante.
- [ ] **Step 3: `ProductCard.tsx`** — badge "OFICIAL" só se `brandConfig.features.showOfficialBadge` (texto `brandConfig.officialBadgeLabel`); badge de desconto só se `discountPercent(price, variant?.calculated_price?.original_amount) > 0`, com o valor real; "Cupom R$ 5 OFF" vira `Cupom R$ 5 OFF acima de R$ 50`; `soldLabel = formatSoldLabel(product.metadata?.sold_count)` renderizado só se não-nulo; se `product.metadata?.review_count` → `formatRatingLabel` em linha pequena acima do preço. Remover import de `deterministicInRange`.
- [ ] **Step 4: `PdpClient.tsx`** — remover import e uso de `SellerCard` e a const `SELLER_NAME`; badge OFICIAL condicionada à flag; a linha `4.8 ★★★★★ | 2,3 mil avaliações | 8,4 mil vendidos` vira: `[formatRatingLabel(product.metadata?.review_avg, product.metadata?.review_count), formatSoldLabel(product.metadata?.sold_count)].filter(Boolean).join(" | ")`, renderizando o `<p>` só se a string não for vazia. Adicionar `metadata` a `PRODUCT_DETAIL_FIELDS` e `metadata?: { sold_count?: number; review_count?: number; review_avg?: number } | null` a `ProductDetail`.
- [ ] **Step 5: `FlashSaleSection.tsx`** — remover a barra/`% VENDIDOS` e o `deterministicInRange` (a seção inteira é refeita na Task 9; aqui só tira o fake). Depois disso, apagar `deterministicInRange` de `medusa.ts` (grep deve mostrar zero usos).
- [ ] **Step 6: Apagar `SellerCard.tsx`**.
- [ ] **Step 7: Verificar** — `npx tsc --noEmit && npm run lint`; na home nenhum card mostra "-20%", "OFICIAL" nem "mil vendidos"; na PDP não existe mais a linha de nota nem o cartão de vendedor; `grep -rn "deterministicInRange\|SellerCard" src app` vazio.
- [ ] **Step 8: Commit** — `feat(storefront): remove badges e contadores fake dos cards e da PDP; badge oficial vira flag`

### Task 4: Ficha técnica real

**Files:**
- Modify: `platform/apps/storefront/src/lib/medusa.ts` (`PRODUCT_DETAIL_FIELDS`, `ProductDetail`)
- Modify: `platform/apps/storefront/src/components/SpecsTable.tsx`
- Modify: `platform/apps/storefront/src/components/PdpClient.tsx:231`
- Modify: `platform/apps/storefront/src/config/brand.config.ts`

**Interfaces:**
- Produces: `ProductDetail` ganha `categories?: { id: string; name: string; handle: string }[]`, `weight?: number | null`, `length?: number | null`, `width?: number | null`, `height?: number | null`, `material?: string | null`, `origin_country?: string | null`. `PRODUCT_DETAIL_FIELDS` ganha `categories.id,categories.name,categories.handle,weight,length,width,height,material,origin_country,metadata`.
- Produces: `SpecsTable({ product, selectedVariant, stock }: { product: ProductDetail; selectedVariant?: ProductVariantDetail; stock: number })`.
- Produces: `BrandConfig.shipsFromLabel?: string` (valor `"Satuba - AL"`).

- [ ] **Step 1: Tipos e fields** em `medusa.ts` conforme Interfaces.
- [ ] **Step 2: `SpecsTable`** — montar `rows` só com dado presente, nesta ordem: Categoria (`product.categories?.[0]?.name`); Estoque (`stock > 0 ? \`${stock} unidades\` : "Esgotado"` — sempre); SKU (`selectedVariant?.sku`); Código OEM (`selectedVariant?.metadata?.oem_part_number`); EAN (`ean_barcode`); Compatível com (`compatible_motorcycles` → `"Honda CG 160 (2016–2026)"` por item, separados por `; `); Especificação (`viscosity_or_spec`); Peso (`weight` em gramas → `"1,2 kg"` se ≥ 1000, senão `"850 g"`); Dimensões (só se `length && width && height` → `"20 × 15 × 10 cm"`); Material; Origem (`origin_country === "br"` ou `"BR"` → `"Brasil"`, senão o código em maiúsculas); Envio de (`brandConfig.shipsFromLabel`). Se `rows` ficar com só Estoque, ainda renderiza. Manter a descrição abaixo da tabela.
- [ ] **Step 3: `PdpClient.tsx:231`** → `<SpecsTable product={product} selectedVariant={selectedVariant} stock={stock} />`.
- [ ] **Step 4: Verificar** — `npx tsc --noEmit && npm run lint`; abrir `/produto/kit-relacao-transmissao-aco-1045-vruumoto-original`: Estoque mostra o número real da variante selecionada (trocar a opção muda a linha), Peso "1,2 kg", Categoria "Motor", sem "Nacional"/"Ver descrição"/"São Paulo".
- [ ] **Step 5: Commit** — `feat(storefront): ficha tecnica montada com dados reais do produto e da variante`

### Task 5: Instalar app (PWA) + QR real no footer

**Files:**
- Modify: `platform/apps/storefront/src/components/PwaRegister.tsx`
- Create: `platform/apps/storefront/src/lib/pwa-install.ts`
- Create: `platform/apps/storefront/src/components/InstallAppButton.tsx`
- Create: `platform/apps/storefront/src/components/SiteQrCanvas.tsx`
- Modify: `platform/apps/storefront/src/components/Footer.tsx:80-89`

**Interfaces:**
- Produces: `src/lib/pwa-install.ts`: `type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }`; `setDeferredPrompt(e: BeforeInstallPromptEvent | null): void`; `getDeferredPrompt(): BeforeInstallPromptEvent | null`; `subscribeInstallPrompt(cb: () => void): () => void` (notifica quando o prompt chega); `isStandalone(): boolean` (`matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true`); `isIos(): boolean`.
- Produces: `InstallAppButton()` client component: `null` se `isStandalone()`; botão "Instalar app" se há prompt (chama `prompt()`, depois limpa); em iOS sem prompt mostra texto "No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início"; em outros casos sem prompt mostra `null`.
- Produces: `SiteQrCanvas({ url, size }: { url: string; size: number })` usando `QRCode.toCanvas` (mesmo import de `PixQrCanvas.tsx`).

- [ ] **Step 1: `pwa-install.ts`** conforme Interfaces (estado em variável de módulo + `Set` de listeners).
- [ ] **Step 2: `PwaRegister.tsx`** — além do registro do SW, `window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent) })` e `window.addEventListener("appinstalled", () => setDeferredPrompt(null))`. O listener do prompt deve ficar fora do `if (process.env.NODE_ENV !== "production")` (o SW continua só em produção).
- [ ] **Step 3: `InstallAppButton.tsx`** e **`SiteQrCanvas.tsx`** conforme Interfaces.
- [ ] **Step 4: `Footer.tsx`** — substituir o bloco "QR Code do App" por `<SiteQrCanvas url={siteUrl} size={96} />` + `<InstallAppButton />` + texto "Escaneie para abrir a loja no celular ou instale como app". `siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vruumoto.com.br"` (adicionar a variável em `.env.vruumoto.example`).
- [ ] **Step 5: Verificar** — `npx tsc --noEmit && npm run lint`; `npm run build && npm run start` (prompt só existe em build de produção): no Chrome desktop, o botão aparece após alguns segundos na home (Chrome exige engajamento) e o QR renderiza; no DevTools → Application → Manifest sem erros.
- [ ] **Step 6: Commit** — `feat(storefront): botao instalar app (PWA) e QR real do site no lugar do placeholder`

**Fechar PR 1:** push `brand/vruumoto` (ou branch + PR, conforme o fluxo do dono), esperar deploy do storefront e conferir `https://vruumoto.com.br/busca?q=kit` e a home no celular.

---

## PR 2 — "X vendidos" real

### Task 6: Subscriber `order.placed` + script de backfill

**Files:**
- Create: `platform/apps/backend/src/subscribers/order-placed-sold-count.ts`
- Create: `platform/apps/backend/src/modules/product-stats/sold-count.ts`
- Create: `platform/apps/backend/src/modules/product-stats/__tests__/sold-count.unit.spec.ts`
- Create: `platform/apps/backend/src/scripts/backfill-sold-count.ts`

**Interfaces:**
- Produces: `applySoldCount(deps: { query: { graph: Function }; productService: { retrieveProduct(id: string): Promise<any>; updateProducts(id: string, data: any): Promise<any> }; orderService: { updateOrders(data: any): Promise<any> } }, orderId: string): Promise<{ updated: string[]; skipped: boolean }>` em `sold-count.ts`. Regras: busca o pedido com `fields: ["id","status","metadata","items.product_id","items.quantity"]`; se `order.metadata?.sold_counted === true` ou `status === "canceled"` → `{ updated: [], skipped: true }`; agrupa `quantity` por `product_id`; para cada produto, `updateProducts(product_id, { metadata: { ...product.metadata, sold_count: (Number(product.metadata?.sold_count) || 0) + qty } })` (espalhar o metadata existente — `updateProducts` substitui o objeto inteiro); ao fim `updateOrders([{ id, metadata: { ...order.metadata, sold_counted: true } }])`.
- Subscriber: `event: "order.placed"`, resolve `ContainerRegistrationKeys.QUERY`, `Modules.PRODUCT`, `Modules.ORDER` e chama `applySoldCount`.
- Script: `export default async function backfillSoldCount({ container }: ExecArgs)` — lista todos os pedidos (`query.graph` entity `order`, fields `["id"]`, filtro `status: { $ne: "canceled" }`), chama `applySoldCount` em cada um, loga `updated/skipped` totais.

- [ ] **Step 1: Teste unitário** `sold-count.unit.spec.ts` com mocks (padrão de `src/api/admin/access-control/payment-gateway/__tests__/route.unit.spec.ts`): (a) pedido com 2 itens do mesmo produto (qty 1 e 2) e `metadata.sold_count: 10` → `updateProducts` chamado com `sold_count: 13` e metadata anterior preservado; (b) pedido já `sold_counted` → nenhum `updateProducts`, `skipped: true`; (c) pedido `canceled` → `skipped: true`.
- [ ] **Step 2: Rodar** `npm run test:unit` → falha por módulo inexistente.
- [ ] **Step 3: Implementar `sold-count.ts`**, o subscriber e o script.
- [ ] **Step 4: Rodar** `npm run test:unit` → passa; `npm run build` → ok.
- [ ] **Step 5: Commit** — `feat(backend): conta vendidos por produto em order.placed + script de backfill`
- [ ] **Step 6: Deploy e backfill** — push; quando `api.vruumoto.com.br` responder (`curl -s https://api.vruumoto.com.br/health`), rodar no VPS: `docker exec <container vruum-backend> npx medusa exec ./src/scripts/backfill-sold-count.ts` (se o container só tiver `.medusa/server`, rodar de dentro dele: `cd .medusa/server && npx medusa exec ./src/scripts/backfill-sold-count.js`). Conferir: `curl -s "https://api.vruumoto.com.br/store/products?fields=id,metadata" -H "x-publishable-api-key: <pk>" | grep sold_count`.
- [ ] **Step 7: Verificar na loja** — produtos com `sold_count >= 5` mostram "N vendidos" no card e na PDP (Task 3 já lê o campo); abaixo disso nada aparece.

---

## PR 3 — Ofertas Relâmpago por Price List

### Task 7: Rota `GET /store/flash-sale`

**Files:**
- Create: `platform/apps/backend/src/api/store/flash-sale/route.ts`
- Create: `platform/apps/backend/src/api/store/flash-sale/resolve.ts`
- Create: `platform/apps/backend/src/api/store/flash-sale/__tests__/resolve.unit.spec.ts`

**Interfaces:**
- Produces: `resolveFlashSale(deps: { pricing: { listPriceLists(filters: any, config: any): Promise<any[]> }; query: { graph: Function } }, now: Date): Promise<{ active: false } | { active: true; title: string; ends_at: string; product_ids: string[] }>` em `resolve.ts`. Regras: `listPriceLists({ status: "active", type: "sale" }, { relations: ["prices"] })`; descartar as que têm `ends_at` nulo, `ends_at <= now`, ou `starts_at > now`; escolher a de `ends_at` mais próximo; coletar `prices[].price_set_id`; mapear pra variante/produto com `query.graph({ entity: "product_variant", fields: ["id","product_id","price_set.id"] })` filtrando no código por `price_set.id ∈ ids` (catálogo pequeno; se o alias `price_set` não existir no link, usar `entity: "price_set", fields: ["id","variant.product_id"], filters: { id: ids }`); `product_ids` únicos; se vazio → `{ active: false }`.
- Rota: `GET` sem auth, `res.json(await resolveFlashSale({ pricing: req.scope.resolve(Modules.PRICING), query: req.scope.resolve(ContainerRegistrationKeys.QUERY) }, new Date()))`. Cabeçalho `Cache-Control: public, max-age=60`.

- [ ] **Step 1: Teste** `resolve.unit.spec.ts`: (a) uma price list ativa com `ends_at` daqui 1h e 2 prices → `active: true`, `product_ids` com os 2 produtos mapeados (mock do `graph`); (b) `ends_at` no passado → `active: false`; (c) `ends_at` nulo → `active: false`; (d) duas ativas → escolhe a que termina primeiro.
- [ ] **Step 2: Rodar** `npm run test:unit` → falha.
- [ ] **Step 3: Implementar** `resolve.ts` e `route.ts`.
- [ ] **Step 4: Rodar** `npm run test:unit` e `npm run build` → ok.
- [ ] **Step 5: Commit** — `feat(backend): rota publica /store/flash-sale baseada em price list ativa`

### Task 8: Seção de ofertas real no storefront

**Files:**
- Modify: `platform/apps/storefront/src/lib/medusa.ts` (`getFlashSale`)
- Modify: `platform/apps/storefront/src/components/FlashSaleSection.tsx`
- Modify: `platform/apps/storefront/src/components/FlashSaleCountdown.tsx`
- Modify: `platform/apps/storefront/app/page.tsx`

**Interfaces:**
- Produces: `getFlashSale(): Promise<{ active: false } | { active: true; title: string; ends_at: string; product_ids: string[] }>`.
- Produces: `FlashSaleSection({ title, endsAt, products }: { title: string; endsAt: string; products: MedusaProduct[] })` — sem fallback fake; `FlashSaleCountdown({ endsAt }: { endsAt: string })` conta até o instante real (ao chegar em 0, fica em `00:00:00`).

- [ ] **Step 1: `getFlashSale`** em `medusa.ts`.
- [ ] **Step 2: `app/page.tsx`** — `const sale = await getFlashSale()`; se `sale.active`, `const { products: saleProducts } = await listProducts({ ids: sale.product_ids, limit: 12 })` e renderiza `<section id="ofertas"><FlashSaleSection title={sale.title} endsAt={sale.ends_at} products={saleProducts} /></section>`; senão não renderiza nada.
- [ ] **Step 3: `FlashSaleSection`** — por produto: preço atual, preço original riscado (`calculated_price.original_amount`) e `-{discountPercent}%` (helper da Task 3); se `variants[0].inventory_quantity <= 10` mostra `Restam N`; sem barra de porcentagem. Título vem de `title` (fallback "Ofertas Relâmpago").
- [ ] **Step 4: `FlashSaleCountdown`** — `remaining = max(0, Date.parse(endsAt) - Date.now())`, atualizado por `setInterval` 1s; inicializar com o mesmo cálculo (sem `durationMs`).
- [ ] **Step 5: Verificar** — `npx tsc --noEmit && npm run lint`. No admin do demo (`https://api.vruumoto.com.br/app` → Pricing → Price Lists → Create): título "Relâmpago teste", tipo **Sale**, status Active, start agora, end +2h, 2 produtos com preço menor. `curl -s https://api.vruumoto.com.br/store/flash-sale` → `active: true` com 2 `product_ids`. Home mostra a seção com contador real e preço riscado; PDP desses produtos mostra o desconto; adicionar ao carrinho cobra o preço da oferta. Mudar `end` pra passado → `curl` dá `active: false` e a seção some. Apagar a price list de teste ao final.
- [ ] **Step 6: Commit** — `feat(storefront): ofertas relampago lidas da price list ativa, com contador e preco reais`

---

## PR 4 — Avaliações moderadas

### Task 9: Categorias de permissão novas com fallback

**Files:**
- Modify: `platform/apps/backend/src/modules/access-control/permissions.ts`
- Create: `platform/apps/backend/src/modules/access-control/__tests__/permissions-merge.unit.spec.ts`

**Interfaces:**
- Produces: `PermissionCategory` ganha `"product_reviews"` e `"banners"`. `ALL_TRUE` e os 4 papéis: super_admin `true`/`true`; gerente `true`/`true`; operador_pdv `false`/`false`; atendimento_marketing `true`/`true`. `PREFIX_MAP` ganha `["/admin/product-reviews","product_reviews"]` e `["/admin/banners","banners"]`.
- Produces: `mergeWithRoleDefaults(slug: string, stored: Partial<PermissionMap> | null | undefined): PermissionMap` — defaults do `ROLE_DEFINITIONS` do slug (ou `ROLE_DEFINITIONS[0]` se o slug não existir) sobrescritos pelo que está salvo. `getRoleAndPermissionsForUser` passa a retornar `permissions: mergeWithRoleDefaults(role.slug, role.permissions)`.

- [ ] **Step 1: Teste** — papel `atendimento_marketing` salvo no banco sem a chave `product_reviews` → merge devolve `product_reviews: true`; chave salva `orders: false` vence o default.
- [ ] **Step 2: Rodar** `npm run test:unit` → falha.
- [ ] **Step 3: Implementar** (o compilador vai exigir as novas chaves em todos os mapas — preencher conforme Interfaces).
- [ ] **Step 4: Rodar** `npm run test:unit && npm run build` → ok.
- [ ] **Step 5: Commit** — `feat(backend): categorias de permissao product_reviews e banners com fallback dos defaults`

### Task 10: Módulo `product-reviews`

**Files:**
- Create: `platform/apps/backend/src/modules/product-reviews/models/product-review.ts`
- Create: `platform/apps/backend/src/modules/product-reviews/service.ts`
- Create: `platform/apps/backend/src/modules/product-reviews/index.ts`
- Create: `platform/apps/backend/src/modules/product-reviews/summary.ts`
- Create: `platform/apps/backend/src/modules/product-reviews/__tests__/summary.unit.spec.ts`
- Create (gerada): `platform/apps/backend/src/modules/product-reviews/migrations/Migration*.ts`
- Modify: `platform/apps/backend/medusa-config.ts` (adicionar `{ resolve: "./src/modules/product-reviews" }`)

**Interfaces:**
- Model `product_review`: `id` pk; `product_id: text`; `customer_id: text`; `author_name: text` (já mascarado); `rating: number`; `title: text nullable`; `body: text`; `status: enum("pending","approved","rejected")` default `"pending"`; `verified_purchase: boolean` default `false`. Índices: `product_id`, `status`; único `(product_id, customer_id)` (com `deleted_at IS NULL`, como o índice de slug de `institutional_page`).
- `PRODUCT_REVIEWS_MODULE = "productReviews"`; service `ProductReviewsModuleService extends MedusaService({ ProductReview })` (gera `listProductReviews`, `createProductReviews`, `updateProductReviews`, `deleteProductReviews`, `retrieveProductReview`).
- `summary.ts`: `maskAuthorName(firstName: string | null | undefined, lastName?: string | null): string` → `"j*****3"` (primeira letra do nome + `*****` + último caractere do sobrenome ou do nome; sem nome → `"Cliente"`); `computeSummary(reviews: { rating: number }[]): { review_count: number; review_avg: number; by_rating: Record<1|2|3|4|5, number> }` (`review_avg` com 1 casa decimal, `0` se vazio); `syncProductReviewSummary(deps: { reviewsService: any; productService: any }, productId: string): Promise<void>` — lista aprovadas do produto, computa, grava `metadata: { ...product.metadata, review_count, review_avg }` (espalhar metadata existente).

- [ ] **Step 1: Teste** `summary.unit.spec.ts`: `maskAuthorName("joao","silva") === "j*****a"`; `maskAuthorName(null) === "Cliente"`; `computeSummary([5,4,5])` → `count 3, avg 4.7, by_rating {5:2,4:1,...0}`; `computeSummary([])` → `count 0, avg 0`.
- [ ] **Step 2: Rodar** `npm run test:unit` → falha.
- [ ] **Step 3: Implementar** model, service, index, `summary.ts`; registrar em `medusa-config.ts`.
- [ ] **Step 4: Gerar migration** — `npx medusa db:generate productReviews` (precisa de `DATABASE_URL` válido no `.env`; se não houver banco local, escrever a migration à mão no padrão de `institutional-pages/migrations/Migration20261018172036.ts` com `create table if not exists "product_review" (...)`, índices e `down` com `drop table`).
- [ ] **Step 5: Rodar** `npm run test:unit && npm run build` → ok.
- [ ] **Step 6: Commit** — `feat(backend): modulo product-reviews (model, migration, resumo em product.metadata)`

### Task 11: Rotas store de avaliações

**Files:**
- Create: `platform/apps/backend/src/api/store/products/[id]/reviews/route.ts`
- Create: `platform/apps/backend/src/api/store/products/[id]/reviews/validate.ts`
- Create: `platform/apps/backend/src/api/store/products/[id]/reviews/__tests__/validate.unit.spec.ts`
- Modify: `platform/apps/backend/src/api/middlewares.ts` (POST `/store/products/:id/reviews` → `authenticate('customer', ['bearer'])`)

**Interfaces:**
- `GET /store/products/:id/reviews?limit=10&offset=0&rating=5` → `{ reviews: { id, author_name, rating, title, body, verified_purchase, created_at }[], count, summary: { review_count, review_avg, by_rating } }` — só `status: "approved"`, ordem `created_at DESC`; `rating` opcional filtra.
- `POST /store/products/:id/reviews` body `{ rating: number; title?: string; body: string }` → `201 { review: { id, status: "pending" } }`. `validateReviewBody(body: unknown): { ok: true; value: { rating: number; title: string | null; body: string } } | { ok: false; message: string }` em `validate.ts`: `rating` inteiro 1–5; `body` string com 10–1000 caracteres após `trim`; `title` opcional ≤ 80. Erros em pt-BR (`"Nota deve ser de 1 a 5."`, `"Comentário deve ter entre 10 e 1000 caracteres."`). Regras da rota: `customerId` de `req.auth_context.actor_id` (401 se ausente, padrão de `customers/me/password/route.ts`); produto inexistente → 404 (`query.graph` entity `product` fields `["id"]`); já existe review do cliente nesse produto → `409 { message: "Você já avaliou este produto." }`; `author_name = maskAuthorName(customer.first_name, customer.last_name)` (customer via `Modules.CUSTOMER` `retrieveCustomer`); `verified_purchase = true` se `query.graph({ entity: "order", filters: { customer_id }, fields: ["items.product_id"] })` tiver algum item com esse `product_id`.

- [ ] **Step 1: Teste** `validate.unit.spec.ts`: rating 0 → erro; rating 3.5 → erro; body com 5 chars → erro; body válido com espaços → `trim` aplicado; title ausente → `null`.
- [ ] **Step 2: Rodar** `npm run test:unit` → falha.
- [ ] **Step 3: Implementar** `validate.ts`, `route.ts` (GET e POST), middleware.
- [ ] **Step 4: Rodar** `npm run test:unit && npm run build` → ok.
- [ ] **Step 5: Commit** — `feat(backend): rotas store de avaliacoes (listar aprovadas, criar pendente)`

### Task 12: Moderação no admin

**Files:**
- Create: `platform/apps/backend/src/api/admin/product-reviews/route.ts` (GET lista)
- Create: `platform/apps/backend/src/api/admin/product-reviews/[id]/route.ts` (PUT status, DELETE)
- Create: `platform/apps/backend/src/admin/routes/product-reviews/page.tsx`

**Interfaces:**
- `GET /admin/product-reviews?status=pending|approved|rejected|all` → `{ reviews: (ProductReview & { product_title: string })[] }` (título via `query.graph` entity `product` com `filters: { id: [...] }`, fields `["id","title"]`), ordem `created_at DESC`, default `status=pending`.
- `PUT /admin/product-reviews/:id` body `{ status: "approved" | "rejected" }` → atualiza e chama `syncProductReviewSummary` (Task 10) pro `product_id` da review → `{ review }`. Status inválido → 400.
- `DELETE /admin/product-reviews/:id` → apaga e sincroniza o resumo → `{ id, deleted: true }`.
- Página admin "Avaliações" (`defineRouteConfig({ label: "Avaliações" })`), copiando a estrutura de `institutional-pages/page.tsx` (`adminFetch`, checagem `permissions.product_reviews`): abas Pendentes / Aprovadas / Rejeitadas; cada linha mostra produto, autor, estrelas, título, corpo, selo "Compra verificada", data; botões Aprovar / Rejeitar / Excluir (Excluir com `window.confirm`).

- [ ] **Step 1: Implementar** as rotas e a página.
- [ ] **Step 2: Rodar** `npm run build` → ok (admin compila junto).
- [ ] **Step 3: Commit** — `feat(backend): moderacao de avaliacoes no admin (listar, aprovar, rejeitar, excluir)`
- [ ] **Step 4: Deploy e teste real** — push; após subir: criar review via `curl -X POST https://api.vruumoto.com.br/store/products/<id>/reviews -H "Authorization: Bearer <token de cliente>" -H "x-publishable-api-key: <pk>" -d '{"rating":5,"body":"Produto excelente, chegou rapido."}'` (token: `POST /auth/customer/emailpass` com um cliente de teste criado via `/auth/customer/emailpass/register` + `/store/customers`); `GET .../reviews` → `count 0` (pendente não aparece); no admin, aba Pendentes mostra a review → Aprovar; `GET` → `count 1`, `summary.review_avg 5`; segundo `POST` do mesmo cliente → 409. Ao final apagar a review de teste e o cliente de teste.

### Task 13: Bloco de avaliações real na PDP

**Files:**
- Modify: `platform/apps/storefront/src/lib/medusa.ts` (`getProductReviews`, `postProductReview`)
- Rewrite: `platform/apps/storefront/src/components/ReviewsBlock.tsx`
- Modify: `platform/apps/storefront/src/components/PdpClient.tsx:232`

**Interfaces:**
- `getProductReviews(productId: string, opts?: { rating?: number; limit?: number; offset?: number }): Promise<{ reviews: StoreReview[]; count: number; summary: ReviewSummary }>` e `postProductReview(productId: string, token: string, body: { rating: number; title?: string; body: string }): Promise<void>` (usa `getSessionToken()` de `src/lib/auth.ts` no chamador; erro HTTP vira `Error(message)` como em `authFetch`).
- `ReviewsBlock({ productId }: { productId: string })` client: carrega no mount; cabeçalho `Avaliações` + `formatRatingLabel(summary.review_avg, summary.review_count)` (nada se `count 0`); filtros `Todas / 5 / 4 / 3 / 2 / 1 estrelas` que refazem a busca com `rating`; lista (autor, variante não existe mais — mostrar só nome mascarado, estrelas, "Compra verificada", data `dd/mm/aaaa`, título, corpo); vazio → "Este produto ainda não tem avaliações."; formulário "Avaliar este produto" só se `isLoggedIn()` (senão link "Entre para avaliar" → `/login?next=<pathname>`): select nota 1–5, título opcional, textarea; após envio: "Obrigado! Sua avaliação será publicada após moderação."; 409 → mensagem do backend.

- [ ] **Step 1: Helpers** em `medusa.ts` conforme Interfaces.
- [ ] **Step 2: Reescrever `ReviewsBlock.tsx`** (sem `mockReviews`).
- [ ] **Step 3: `PdpClient.tsx:232`** → `<ReviewsBlock productId={product.id} />`.
- [ ] **Step 4: Verificar** — `npx tsc --noEmit && npm run lint`; PDP de produto sem reviews mostra o texto vazio e, logado, o formulário; enviar → mensagem de moderação; aprovar no admin → recarregar mostra a review e a nota no cabeçalho e na linha da PDP (Task 3); filtro por estrela funciona; card na home passa a mostrar `4,8 ★ (1 avaliação)` para esse produto (vem de `metadata.review_*`).
- [ ] **Step 5: Commit** — `feat(storefront): avaliacoes reais na PDP com formulario para cliente logado`

---

## PR 5 — Carrossel controlado pelo admin

### Task 14: Módulo `banners` + rotas + página admin

**Files:**
- Create: `platform/apps/backend/src/modules/banners/models/banner.ts`, `service.ts`, `index.ts`, `migrations/Migration*.ts`
- Create: `platform/apps/backend/src/modules/banners/active.ts` + `__tests__/active.unit.spec.ts`
- Create: `platform/apps/backend/src/api/store/banners/route.ts`
- Create: `platform/apps/backend/src/api/admin/banners/route.ts` (GET, POST) e `[id]/route.ts` (PUT, DELETE)
- Create: `platform/apps/backend/src/admin/routes/banners/page.tsx`
- Modify: `platform/apps/backend/medusa-config.ts`

**Interfaces:**
- Model `banner`: `id`; `image_url: text`; `alt: text`; `title: text nullable`; `link: text nullable`; `sort_order: number` default 0; `active: boolean` default true; `starts_at: dateTime nullable`; `ends_at: dateTime nullable`. `BANNERS_MODULE = "banners"`.
- `filterActiveBanners(banners: Banner[], now: Date): Banner[]` em `active.ts` — `active === true`, `starts_at` nulo ou ≤ now, `ends_at` nulo ou > now, ordenado por `sort_order ASC, created_at ASC`.
- `GET /store/banners` → `{ banners: { id, image_url, alt, title, link }[] }` (usa `filterActiveBanners`), `Cache-Control: public, max-age=60`.
- Admin: `GET /admin/banners` → todos; `POST` body `{ image_url, alt, title?, link?, sort_order?, active?, starts_at?, ends_at? }` (400 se faltar `image_url` ou `alt`, ou se `image_url` não começar com `/` nem `https://`); `PUT /admin/banners/:id` parcial; `DELETE`. Página "Banners" (`defineRouteConfig({ label: "Banners" })`, permissão `banners`): tabela com preview (`<img>` 160px), título, ordem, ativo, janela; formulário de criar/editar com os campos; dica fixa: "Imagem: 1600×400 (desktop) — use uma URL pública ou um arquivo em /images/ do storefront".

- [ ] **Step 1: Teste** `active.unit.spec.ts`: inativo fora; `starts_at` futuro fora; `ends_at` passado fora; ordenação por `sort_order`.
- [ ] **Step 2: Rodar** `npm run test:unit` → falha.
- [ ] **Step 3: Implementar** módulo, migration (gerar ou à mão, como na Task 10), rotas, página; registrar em `medusa-config.ts`.
- [ ] **Step 4: Rodar** `npm run test:unit && npm run build` → ok.
- [ ] **Step 5: Commit** — `feat(backend): modulo banners com CRUD no admin e rota publica`

### Task 15: `HeroBanner` vira carrossel real

**Files:**
- Modify: `platform/apps/storefront/src/lib/medusa.ts` (`getBanners`)
- Create: `platform/apps/storefront/src/components/HeroCarousel.tsx`
- Modify: `platform/apps/storefront/src/components/HeroBanner.tsx`
- Modify: `platform/apps/storefront/app/page.tsx`

**Interfaces:**
- `getBanners(): Promise<{ id: string; image_url: string; alt: string; title: string | null; link: string | null }[]>` (erro → `[]`).
- `HeroCarousel({ slides }: { slides: Banner[] })` client: container `overflow-x-auto snap-x snap-mandatory` com um slide por `100%` de largura; autoplay 5 s (pausa com o mouse em cima e quando a aba está oculta); pontinhos = `slides.length`, clicáveis, o ativo acompanha o scroll (`scroll` listener + `scrollLeft / clientWidth`); slide com `link` é `<Link>`; `title` sobreposto se existir. Um único slide → sem pontinhos e sem autoplay.
- `HeroBanner({ slides }: { slides: Banner[] })`: `slides.length === 0` → render atual (estático, manifest); senão `<HeroCarousel slides={slides} />` no lugar da imagem principal (mobile e desktop), mantendo os dois tiles laterais do desktop.

- [ ] **Step 1: `getBanners`** em `medusa.ts`.
- [ ] **Step 2: `HeroCarousel.tsx`** conforme Interfaces (sem dependência nova).
- [ ] **Step 3: `HeroBanner.tsx`** recebe `slides`; `app/page.tsx` faz `const slides = await getBanners()` e passa.
- [ ] **Step 4: Verificar** — `npx tsc --noEmit && npm run lint`; sem banners cadastrados a home fica igual a hoje (menos os 3 pontinhos falsos — removê-los do fallback); no admin criar 3 banners (uma URL pode ser `/images/vruumoto/hero-banner.jpg`), um deles com `starts_at` amanhã → home mostra 2 slides, autoplay troca, pontinhos corretos, swipe no mobile; desativar um → some em até 60 s.
- [ ] **Step 5: Commit** — `feat(storefront): carrossel de banners controlado pelo admin`

---

## Depois de cada PR

- Anotar no `REGISTRO.md` do Hubia uma linha e, na nota "Projeto eco" do Basic Memory, o que mudou (o coordenador faz isso, não o agente implementador).
- Rodar o `@qa` (ou revisor) no diff antes de aceitar.
