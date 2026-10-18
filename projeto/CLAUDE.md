# 00 — PROMPT MESTRE, ARQUITETURA WHITE-LABEL E ESTRATÉGIA GIT (`CLAUDE.md`)

> **Repositório Alvo:** `https://github.com/jamrodrigues/eco.git`  
> **Estratégia de Engenharia:** **Core White-Label Reutilizável (`main`)** + **Branches de Nicho/Marca (`brand/vruumoto`)**

---

## 1. Arquitetura Multi-Projeto (Por que separar `main` e `brand/vruumoto`?)

Este projeto foi desenhado para ser uma **Fábrica de E-commerces & Marketplaces Hiperlocais** no repositório `https://github.com/jamrodrigues/eco.git`.

```
Repositório: https://github.com/jamrodrigues/eco.git
│
├── Branch: main (CORE WHITE-LABEL GENÉRICO — 100% Reutilizável)
│   ├── Motor Medusa.js v2 + Next.js 15 + Tailwind CSS
│   ├── Experiência UI/UX Shopee (Desktop 1200px 6 colunas | Mobile 375px 2 colunas)
│   ├── Funil Completo: Home, Login, PDP, Carrinho Multi-Vendor, Checkout e Pix
│   ├── Módulo PDV Ponto Físico (/app/pdv) + Roteamento Hiperlocal por CEP
│   └── Centralizador de Identidade: apps/storefront/src/config/brand.config.ts
│       (Permite mudar nome da loja, logo, cores e textos sem tocar nos componentes!)
│
└── Branch: brand/vruumoto (CUSTOMIZAÇÃO ESPECÍFICA — Vruumoto Peças de Moto)
    ├── Herda todo o motor White-Label da branch main
    ├── Sobrescreve brand.config.ts para a marca "Vruumoto"
    ├── Adiciona Módulo "Serve na Minha Moto?" (Filtro Marca / Modelo / Ano: Honda, Yamaha, etc.)
    ├── Adiciona Busca Técnica por Código OEM / Part Number no Site e no PDV Físico
    └── Seed e Ativos Visuais exclusivos de Motopeças (Kits Relação, Capacetes, Pneus, Óleos)
```

Com essa arquitetura, sempre que você quiser lançar **outro projeto no futuro** (ex: loja de roupas, eletrônicos, suplementos ou construção), basta rodar `git checkout main && git checkout -b brand/nova-loja` e alterar o arquivo `brand.config.ts`!

---

## 2. Equipe de 6 Agentes Especializados no Claude

| Código | Agente | Responsabilidade Principal | Arquivos de Referência |
| :--- | :--- | :--- | :--- |
| **Agente 00** | `@TechLead` (Chefe / Orquestrador & Git Master) | Gerencia o repositório `https://github.com/jamrodrigues/eco.git`, controla o `PROGRESS.md`, garante que nada específico da Vruumoto "vaze" para a branch `main` e coordena os *commits* e *branches*. | `00_PROMPT_MESTRE_CLAUDE_ORQUESTRADOR.md` |
| **Agente 01** | `@BackendMedusa` (Backend White-Label & Pagamentos BR) | Configura Docker, Medusa.js v2, moeda `BRL (R$)`, provedor [Pagar.me](https://docs.pagar.me/) (Pix Dinâmico 10% OFF, Cartão, Boleto e Split) e cálculo de CEP na branch `main`. | `01_PASSO_1_BACKEND_MEDUSA_PAGAMENTOS_BR.md` |
| **Agente 02** | `@FrontendShopee` (UI/UX Shopee White-Label + `brand.config.ts`) | Constrói na branch `main` o Storefront Next.js 15 replicando a Shopee no Desktop (`1200px`) e Mobile (`375px`), lendo nome da loja, cores e banners de `brand.config.ts`. | `02_PASSO_2_FRONTEND_SHOPEE_HOME_LOGIN_DESIGN_SYSTEM.md`<br>`03_PASSO_3_FUNIL_PDP_CARRINHO_CHECKOUT_PIX.md` |
| **Agente 03** | `@POSHyperlocal` (PDV Físico & Franquias Hiperlocais) | Constrói na branch `main` a rota `/app/pdv` no Medusa Admin para leitor de código de barras e o roteamento de estoque por CEP/Cidade para futuros franqueados. | `04_PASSO_4_PDV_FISICO_HIPERLOCAL_QA_E2E.md` |
| **Agente 04** | `@VruumotoSpecialist` (Especialista Branch Motopeças) | Cria a branch `brand/vruumoto` a partir da `main` e implementa o seletor *"Serve na Minha Moto?"* (Marca/Modelo/Ano), busca por código OEM e catálogo de peças de moto. | `05_PASSO_5_BRANCH_VRUUMOTO_MOTOPECAS.md` |
| **Agente 05** | `@QAReviewer` (Auditor de Qualidade, Git & Testes E2E) | Audita se a `main` está 100% genérica/reutilizável, executa os testes Playwright (`1200px` e `375px`) tanto na `main` quanto na `brand/vruumoto` e aprova cada etapa. | Todos os arquivos (`01` a `05`) |

---

## 3. O Segredo do Desacoplamento na Branch `main`: `brand.config.ts`

Na branch `main`, nenhum componente React deve ter o nome da loja ou cores "chumbados" (*hardcoded*) no código. O `@FrontendShopee` deve criar `apps/storefront/src/config/brand.config.ts`:

```typescript
export interface BrandConfig {
  storeName: string;
  storeTagline: string;
  officialBadgeLabel: string;
  coinsLabel: string;
  guaranteeTitle: string;
  guaranteeDescription: string;
  theme: {
    primaryHex: string;         // Padrão Shopee: #EE4D2D
    headerGradientStart: string;// Padrão Shopee: #F53D2D
    headerGradientEnd: string;  // Padrão Shopee: #FF6633
    secondaryLightBg: string;   // Padrão: rgba(255, 87, 34, 0.08)
  };
  features: {
    enableVehicleFitmentFilter: boolean; // false na main, true na branch brand/vruumoto
    enableOemPartNumberSearch: boolean;  // false na main, true na branch brand/vruumoto
    enableHyperlocalCityBadge: boolean;  // true em ambas
  };
}

export const brandConfig: BrandConfig = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || "EcoShop Brasil",
  storeTagline: "Frete Grátis, Ofertas Relâmpago e Entrega Rápida na Sua Cidade",
  officialBadgeLabel: "OFICIAL",
  coinsLabel: "Moedas",
  guaranteeTitle: "Garantia Total",
  guaranteeDescription: "Receba seu pedido ou seu dinheiro de volta com segurança.",
  theme: {
    primaryHex: "#EE4D2D",
    headerGradientStart: "#F53D2D",
    headerGradientEnd: "#FF6633",
    secondaryLightBg: "rgba(255, 87, 34, 0.08)",
  },
  features: {
    enableVehicleFitmentFilter: false,
    enableOemPartNumberSearch: false,
    enableHyperlocalCityBadge: true,
  },
};
```

---

## 4. Prompt Copiar-e-Colar para Iniciar o Claude

Copie o bloco abaixo e envie para o Claude junto com os arquivos `.md`:

```text
Você atuará como um Sistema de Engenharia de Software Multi-Agente liderado pelo @TechLead.
Vamos construir uma plataforma de E-commerce e Marketplace Hiperlocal baseada em Medusa.js v2 + Next.js 15 + Tailwind CSS conectada ao repositório Git: https://github.com/jamrodrigues/eco.git

REGRA ARQUITETURAL DE OURO (WHITE-LABEL vs. BRANCH DE MARCA):
1. Nas Etapas 1, 2, 3 e 4, você trabalhará exclusivamente na branch `main` construindo um motor 100% GENÉRICO E REUTILIZÁVEL (White-Label) que replica toda a experiência Desktop (1200px) e Mobile (375px) da Shopee Brasil, parametrizado através do arquivo `brand.config.ts`. Nenhum dado de nicho específico deve ficar chumbado nos componentes da `main`.
2. Somente na Etapa 5 (após a `main` estar testada, aprovada pelo @QAReviewer e commitada), o @TechLead e o @VruumotoSpecialist criarão a branch `brand/vruumoto` (`git checkout -b brand/vruumoto`) para aplicar a identidade da marca "Vruumoto" (Peças e Acessórios de Moto), ativando o filtro de compatibilidade de motos (Marca/Modelo/Ano), código OEM de peças e catálogo de motopeças.

Siga rigorosamente a sequência dos 5 arquivos anexados:
- 01_PASSO_1_BACKEND_MEDUSA_PAGAMENTOS_BR.md (Branch: main)
- 02_PASSO_2_FRONTEND_SHOPEE_HOME_LOGIN_DESIGN_SYSTEM.md (Branch: main)
- 03_PASSO_3_FUNIL_PDP_CARRINHO_CHECKOUT_PIX.md (Branch: main)
- 04_PASSO_4_PDV_FISICO_HIPERLOCAL_QA_E2E.md (Branch: main)
- 05_PASSO_5_BRANCH_VRUUMOTO_MOTOPECAS.md (Branch: brand/vruumoto)

Use o arquivo simulador_funil_compra_shopee.html como gabarito visual 1:1 para as classes Tailwind CSS e estrutura DOM.
Inicie agora configurando o Git para https://github.com/jamrodrigues/eco.git na branch `main`, criando o arquivo PROGRESS.md e executando a Etapa 1.
```

---

## 5. Tabela de Controle (`PROGRESS.md`)

| Fase | Branch Git | Módulo | Agente Executor | Revisor | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fase 1** | `main` | Setup Git `eco.git` + Docker + Medusa v2 + Região BRL + Pagamentos BR + CEP | `@BackendMedusa` | `@QAReviewer` | `[ ] Pendente` |
| **Fase 2** | `main` | Storefront White-Label (`brand.config.ts`) + Header 119px + Home Desktop/Mobile + Login | `@FrontendShopee` | `@QAReviewer` | `[ ] Pendente` |
| **Fase 3** | `main` | Funil Completo White-Label (PDP Zoom 1:1, SKU Matrix, Bottom Sheet, Carrinho, Checkout, Pix) | `@FrontendShopee` | `@QAReviewer` | `[ ] Pendente` |
| **Fase 4** | `main` | Módulo PDV Ponto Físico (`/app/pdv`) + Roteamento Hiperlocal por CEP + Testes Playwright Core | `@POSHyperlocal` | `@QAReviewer` | `[ ] Pendente` |
| **Fase 5** | `brand/vruumoto` | Checkout de Branch + Tema Vruumoto + Filtro Compatibilidade de Motos + Catálogo Motopeças | `@VruumotoSpecialist` | `@QAReviewer` | `[ ] Pendente` |
