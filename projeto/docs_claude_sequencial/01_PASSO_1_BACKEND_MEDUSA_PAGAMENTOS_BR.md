# 01 — PASSO 1: INFRAESTRUTURA, BACKEND MEDUSA.JS V2, PAGAMENTOS BR E FRETE

> **Agente Responsável:** `@BackendMedusa`  
> **Agente Revisor:** `@QAReviewer`  
> **Pré-requisito:** Inicialização do projeto pelo `@TechLead`

---

## 1. Estrutura de Diretórios Monorepo

O `@BackendMedusa` deve estruturar o projeto em formato Monorepo limpo para facilitar o deploy conjunto da API, do Admin, do Storefront e do futuro App Mobile:

```
shopee-medusa-br/
├── CLAUDE.md
├── PROGRESS.md
├── docker-compose.yml
├── apps/
│   ├── backend/                  # Medusa.js v2 Server + Admin UI (/app) + Custom PDV
│   │   ├── src/
│   │   │   ├── admin/            # Rotas customizadas do Medusa Admin (PDV Físico e Franquias)
│   │   │   ├── api/              # Endpoints customizados (CEP, Pix Webhook, Hyperlocal)
│   │   │   ├── modules/          # Módulos customizados (pagarme-pix, cep-shipping, coins)
│   │   │   ├── workflows/        # Workflows transacionais (Split de Pagamento, Baixa de PDV)
│   │   │   └── scripts/          # Script seed-shopee-br.ts (Produtos, Categorias, Cupons)
│   │   └── medusa-config.ts
│   └── storefront/               # Next.js 15 App Router (Interface Shopee Desktop & Mobile)
│       ├── public/
│       │   └── images/shopee-assets/
│       └── src/
└── packages/
    └── shared-types/             # Tipagens TypeScript compartilhadas entre Back, Front e App
```

---

## 2. Configuração do Ambiente Docker (`docker-compose.yml`)

Crie na raiz um arquivo `docker-compose.yml` provisionando **PostgreSQL 16**, **Redis 7** (para fila de eventos, cache de preços de Ofertas Relâmpago e sessões) e **Meilisearch** (para busca instantânea com sugestões no cabeçalho de `840px` da Shopee):

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    container_name: shopee_medusa_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: medusa_user
      POSTGRES_PASSWORD: medusa_password_br
      POSTGRES_DB: medusa_shopee_br
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: shopee_medusa_redis
    restart: unless-stopped
    ports:
      - "6379:6379"

  meilisearch:
    image: getmeili/meilisearch:v1.10
    container_name: shopee_medusa_search
    restart: unless-stopped
    environment:
      MEILI_MASTER_KEY: shopee_br_master_key_search
      MEILI_NO_ANALYTICS: "true"
    ports:
      - "7700:7700"
    volumes:
      - meili_data:/meili_data

volumes:
  postgres_data:
  meili_data:
```

---

## 3. Instalação e Configuração do Medusa.js v2 (`apps/backend`)

1. Inicialize o projeto Medusa v2 em `apps/backend` conectando ao banco PostgreSQL e Redis do Docker.
2. Configure o arquivo `medusa-config.ts` habilitando:
   * `storeCors`, `adminCors`, `authCors` liberados para `http://localhost:3000` (Storefront) e `http://localhost:9000` (Admin).
   * Módulo de Eventos e Workflows via Redis.
3. **Seed Inicial para o Brasil (`src/scripts/seed-shopee-br.ts`):**
   * **Região:** `Brasil`
   * **Moeda Padrão:** `BRL` (`R$`, centavos inteiros no banco, ex: `R$ 53,94` = `5394`).
   * **Locais de Estoque (*Stock Locations*):**
     1. `Loja Física Matriz (Ponto Físico / PDV)` — vinculado ao CEP local da loja.
     2. `CD Franqueado Exemplo (Operação Hiperlocal Cidade)` — preparado para a Fase 2 de expansão.
   * **Canais de Venda (*Sales Channels*):**
     1. `E-commerce Web & Mobile (Shopee Storefront)`
     2. `PDV Ponto Físico (Balcão)`

---

## 4. Módulo de Pagamento Brasileiro com Pix Dinâmico, Desconto Pix (10%) e Split (`src/modules/pagarme-br`)

Construa um *Payment Provider Module* compatível com a arquitetura de módulos do [Medusa.js v2](https://docs.medusajs.com/resources/commerce-modules/payment) que integre [Pagar.me API v5](https://docs.pagar.me/) (com modo Sandbox/Simulação embutido para desenvolvimento local sem chaves externas):

### Funcionalidades Obrigatórias do Módulo de Pagamento:
1. **Geração de Pix Dinâmico (`pp_pix_br`):**
   * Calcula automaticamente o **Desconto Pix Exclusivo** (ex: `10% OFF` configurável por promoção) antes de emitir a cobrança.
   * Retorna no objeto `payment_session.data`:
     * `qr_code_emv`: String oficial EMV (Pix Copia e Cola iniciando com `00020126580014br.gov.bcb.pix...`).
     * `qr_code_base64`: Imagem do QR Code ou payload para renderização em `<canvas>`.
     * `expires_at`: Timestamp ISO adicionando 2 horas de validade (`7200` segundos).
2. **Processamento de Cartão de Crédito (`pp_card_br`):**
   * Suporte a parcelamento em até `12x` (ex: até `3x sem juros` ou com juros da adquirente).
3. **Boleto Bancário (`pp_boleto_br`):**
   * Geração de linha digitável com vencimento em 3 dias úteis.
4. **Regra de Split de Pagamento (Preparado para Franqueados):**
   * Todo pagamento deve ler os metadados de `stock_location_id` / `seller_id` de cada item do pedido e montar o array `split` da transação:
     * `recipient_id` da Matriz recebe $100\%$ na Fase 1 (loja única) ou a comissão de plataforma ($X\%$) quando o produto sair do estoque de um franqueado local, repassando $(100 - X)\%$ automaticamente para a conta recebedora do franqueado.
5. **Webhook & Canal de Liquidação Instantânea (`src/api/webhooks/pagarme/route.ts` + SSE/WebSocket):**
   * Endpoint `POST /webhooks/pagarme` que recebe o evento `order.paid` (e uma rota de simulação local `POST /store/pix/simulate-pay/:cart_id` para testes de desenvolvimento).
   * Emite evento em tempo real via Server-Sent Events (SSE) em `GET /store/pix/status/:order_id` para que a tela final de pedido mude instantaneamente de *"Aguardando confirmação bancária..."* para *"Pagamento Confirmado!"*.

---

## 5. Módulo de Frete Brasileiro e Moedas Gamificadas (`src/modules/shipping-cep` & `src/modules/shopee-coins`)

1. **Cálculo de CEP (`GET /store/shipping/cep?cep=01310100`):**
   * Consulta dados de logradouro/cidade/UF via ViaCEP + calcula 2 modalidades de entrega:
     * `Envio Padrão (Transportadora / Correios)` — ex: `R$ 14,90` (elegível para **Cupom de Frete Grátis**).
     * `Entrega Expressa na Sua Cidade (Motoboy / Franqueado Local)` — ativada automaticamente quando o `cep` do comprador pertencer à mesma cidade de um `Stock Location` ativo!
2. **Motor de Empilhamento Triplo de Descontos + Moedas (`src/workflows/apply-shopee-discounts.ts`):**
   * No Medusa padrão, apenas um desconto simples costuma ser aplicado por vez. Crie um workflow customizado no carrinho que permita **acumular simultaneamente**:
     1. **Cupom da Loja / Vendedor** (ex: `-R$ 5,00` acima de R$ 50).
     2. **Cupom de Frete Grátis da Plataforma** (zera o valor do `shipping_total`, ex: `-R$ 14,90`).
     3. **Moedas da Loja (Shopee Coins)** (saldo na carteira do cliente onde `100 moedas = R$ 1,00`, abatendo ex: `450 moedas = -R$ 4,50`).
     4. **Desconto Pix (10% OFF)** quando o método `pp_pix_br` estiver selecionado no checkout.

---

## 6. Critérios de Aceite do `@QAReviewer` para a Etapa 1

Antes de autorizar a Etapa 2, o `@QAReviewer` deve executar e comprovar:
- [ ] `docker compose up -d` sobe PostgreSQL, Redis e Meilisearch com status `healthy`.
- [ ] `npm run seed` popula ao menos 12 produtos reais em português (incluindo o produto âncora *"Vestido Midi Canelado Lovito Gola Alta Elegante Outono Inverno"* de `R$ 89,90` por `R$ 53,94` com variações `Preto`, `Bege`, `Terracota` e tamanhos `P`, `M` ativos e `G` com `inventory_quantity: 0` esgotado).
- [ ] Teste de API no carrinho comprovando o cálculo exato: Produto (`R$ 53,94`) + Frete (`R$ 14,90`) - Cupom Frete (`R$ 14,90`) - Cupom Loja (`R$ 5,00`) - Moedas (`R$ 4,50`) - Desconto Pix 10% (`R$ 5,39`) = **Total Final de `R$ 39,05` (`3905` centavos)**.
