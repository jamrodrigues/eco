# PROGRESS.md — Controle de Fases (`@TechLead`)

> Repositório: `https://github.com/jamrodrigues/eco.git` — branch `main` (core white-label)
> Monorepo em `platform/` (ver `platform/apps/backend` e `platform/apps/storefront`)

## Tabela de Controle

| Fase | Branch Git | Módulo | Status | Commits |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 1** | `main` | Setup Git + Docker + Medusa v2 + Região BRL + Pagamentos BR + CEP | ✅ Concluída | `6bcf7c5`, `728a24f`, `2de6c95` |
| **Fase 2** | `main` | Storefront White-Label (`brand.config.ts`) + Header 119px + Home Desktop/Mobile + Login | ✅ Concluída | `1c573d3`, `91ee2e0`, `f9e05ba`, `83c04a0` |
| **Fase 3** | `main` | Funil Completo (PDP Zoom, SKU Matrix, Carrinho, Checkout, Pix) | ✅ Concluída | `7bb17bf` |
| **Fase 4** | `main` | PDV Físico (`/app/pdv`) + Franquias Hiperlocais + Testes E2E Playwright | ✅ Concluída | `7748351` |
| **Fase 5** | `brand/vruumoto` | Identidade Vruumoto + Filtro Compatibilidade de Motos + Catálogo Motopeças | ✅ Concluída (nesta branch) | ver abaixo |

## Trabalho adicional (fora do escopo original dos 5 passos)

Itens que apareceram em auditoria pós-Fase 4, antes de abrir a Fase 5:

- ✅ Footer institucional desktop (`f9e05ba`) — faltava na Fase 2
- ✅ Páginas reais para todos os links do Header/Footer, fim dos `href="#"` (`83c04a0`)
- ✅ CMS de páginas institucionais editável pelo Admin, sem precisar de deploy (`9031b3e`)
- ✅ Moedas (Store Coins) como módulo real com ledger + cashback automático + admin configurável (`f2cbb1a`)
- ✅ Cupom de loja migrado do hack client-trusted pro módulo nativo de Promotions do Medusa (`f2cbb1a`)
- ✅ Retirada na loja física + seletor de modalidade de envio no checkout, nunca tinha sido plugado (`63c600f`)
- ✅ RBAC real no Admin (4 papéis: Super Admin, Gerente, Operador de PDV, Atendimento+Marketing) + modo manutenção do storefront (`fafd51e`)
- ✅ Cadastro real de cliente (antes só existia login, zero fluxo de registro), checkout travado a quem tem conta, consentimento LGPD granular (privacidade obrigatória + marketing opcional separados), banner de cookies com opt-in real, e política de privacidade/cookies reescrita no formato LGPD
- ✅ E-mails transacionais reais (confirmação de pedido, boas-vindas só pra cadastro real, reset de senha) + telas `/esqueci-senha` e `/redefinir-senha` — provider sandbox-first (mesmo padrão do pagarme-br): sem `RESEND_API_KEY` só loga, com a chave manda via Resend de verdade
- ✅ Bug achado em auditoria visual mobile: Ofertas Relâmpago nunca mostrava a foto real do produto (sempre shimmer); placeholder "sem foto" estático substitui o shimmer (que simulava carregamento infinito); removidos os 52 produtos de teste criados só pra validar rolagem infinita
- ✅ PWA instalável (manifest + service worker + favicon/ícones próprios, antes era o padrão do Next.js) + `scripts/generate-brand-icons.js` reaproveitável pra trocar logo de qualquer marca (`78b405e`, `40f1263`)
- ✅ E-mails transacionais reais + reset de senha (ver bullet acima — ficou registrado fora de ordem, commit `ba3b539`)

## Fase 5 — branch `brand/vruumoto` (este branch)

Identidade real da Vruumoto (CNPJ 69.233.612/0001-20, Vrumm Motos, Satuba/AL),
não é placeholder:

- `brand.config.ts` **estendido** com campos opcionais novos (`legalName`,
  `cnpj`, `address`, `supportEmail`, `developedByLabel/Url`,
  `logoImagePath`, `serviceShortcuts`) — todos opcionais, `main`/EcoShop
  não quebra (ficam `undefined`, Footer/Header caem no comportamento
  antigo quando ausentes).
- **Bug real achado e corrigido**: `tailwind.config.ts` tinha a cor
  `brand` **hardcoded** (`#EE4D2D` fixo) — o comentário do arquivo já
  dizia que a cor devia vir de `brand.config.ts`, mas nunca vinha de
  fato. Só apareceu ao trocar a cor da Vruumoto e a tela não mudar nada.
  Corrigido importando `brandConfig` direto no `tailwind.config.ts`.
- **Bug real achado e corrigido**: a rota nativa `/store/products` do
  Medusa tem uma allowlist de campos (`query-config.js`) que libera
  `metadata` do produto mas **não** `variants.metadata` — o filtro de
  compatibilidade sempre dava "NÃO compatível" porque os dados de
  fitment nunca chegavam no storefront. Corrigido com uma rota custom
  `GET /store/products/:id/fitment` que expõe só os 4 campos
  necessários (oem_part_number/ean_barcode/compatible_motorcycles/
  viscosity_or_spec), mesclada no client via `getProductByHandle`.
- `motorcycle-fitment`: metadata-only por variante (não é módulo
  Medusa com migration — o doc pede explicitamente metadados
  estruturados, não tabela relacional), com helper de matching
  compartilhado entre PDV e storefront.
- Sales Channel dedicado "Vruumoto — Peças de Moto" (não reaproveita o
  canal da EcoShop) — sandbox roda as duas marcas no mesmo Postgres, e
  sem canal próprio o storefront da Vruumoto mostraria o catálogo
  inteiro da EcoShop junto. Região e Stock Location (Loja Física
  Matriz) são reaproveitados da Fase 1.
- PDV: lookup agora tenta SKU, depois Código OEM, depois EAN
  (`src/api/admin/pdv/lookup/route.ts`).
- Testado de ponta a ponta no browser real: filtro Honda → CG 160
  Titan → 2024 mostra o selo verde na variante certa e vermelho nas
  outras; scan do código OEM real no PDV adiciona o item certo à
  cesta; `GET /store/products` com a publishable key da Vruumoto
  retorna só os 4 produtos da marca (zero vazamento do catálogo
  EcoShop).
- `.env.local` não é versionado — os ids reais gerados pelo seed ficam
  documentados em `platform/apps/storefront/.env.vruumoto.example`.
- ✅ Ícones PWA/favicon trocados pelos arquivos reais que o usuário
  gerou (`icon-192`, `icon-512`, `icon-32`, `favicon.ico` — design
  pneu/roda com wordmark) (`02e6994`).
- ✅ Logo do header vira o wordmark branco (`VRUUMOTO branco.png`),
  tira o nome em texto; header da `main`/EcoShop cai no fallback
  antigo quando `logoImagePath` não existe (`564aeac`).

## Notas de arquitetura / decisões vivas

- **Naming:** proibido usar "Shopee" literal em código/módulos/containers — é engine white-label, Shopee é só referência visual. Ver `projeto/CLAUDE.md` seção 3 (`brand.config.ts`).
- **Idioma do Admin:** Medusa Admin v2.21 não tem config de idioma padrão a nível de projeto — é por usuário, em Configurações → Perfil → Idioma (`Português (Brasil)` já vem traduzido, só não vem selecionado por padrão).
- **Ambiente local:** `docker compose up -d` em `platform/`, depois `npm run dev` em `apps/backend` (porta 9000) e `apps/storefront` (porta 3000). **Nunca rodar `npm run build` do storefront com o `dev` do storefront ativo ao mesmo tempo** — os dois compartilham `.next/` e isso corrompe o cache (já aconteceu 2x nesta sessão).
- **Dev server watcher:** sempre redirecionar o log do `npm run dev` pra fora da pasta observada (ex: temp dir), senão o próprio log entra em loop de restart.

## Próximo passo

Os 5 passos originais do plano estão concluídos (`main` + `brand/vruumoto`),
incluindo a troca de logo/ícones pelos arquivos reais. Pendências conhecidas
pra uma próxima rodada, ambas dependem de insumo do usuário (não dá pra
resolver só com código): revisão jurídica de verdade da política de
privacidade (hoje é estrutural, com placeholders), e configurar um provider
de e-mail real (`RESEND_API_KEY`) antes de qualquer deploy em produção.
