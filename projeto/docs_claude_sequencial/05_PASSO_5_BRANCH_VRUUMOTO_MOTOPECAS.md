# 05 — PASSO 5: BRANCH `brand/vruumoto` — CUSTOMIZAÇÃO VRUUMOTO (PEÇAS E ACESSÓRIOS DE MOTO)

> **Agente Responsável:** `@VruumotoSpecialist`  
> **Agente Revisor:** `@QAReviewer`  
> **Branch Alvo:** `brand/vruumoto` (derivada de `main` no repositório `https://github.com/jamrodrigues/eco.git`)  
> **Pré-requisito Obrigatório:** Etapas 1 a 4 100% concluídas e commitadas na branch `main`.

---

## 1. Comandos Git de Isolamento da Branch

Antes de qualquer alteração da Vruumoto, o `@TechLead` deve garantir que a branch `main` (Core Genérico White-Label) esteja limpa e salva, criando a nova branch isolada:

```bash
# Garante que todo o Core White-Label está salvo na main
git checkout main
git add .
git commit -m "feat(core): complete white-label Shopee experience on Medusa v2 (Desktop, Mobile, POS, Hyperlocal)"
git push -u origin main

# Cria a branch exclusiva da Vruumoto a partir da main
git checkout -b brand/vruumoto
```

---

## 2. Configuração de Identidade `brand.config.ts` na Branch `brand/vruumoto`

Atualize `apps/storefront/src/config/brand.config.ts` exclusivamente nesta branch para ativar a marca **Vruumoto** e ligar as *feature flags* do setor de motopeças:

```typescript
export const brandConfig: BrandConfig = {
  storeName: "Vruumoto",
  storeTagline: "Peças e Acessórios de Moto com Entrega Rápida na Sua Cidade",
  officialBadgeLabel: "ORIGINAL",
  coinsLabel: "Moedas Vruum",
  guaranteeTitle: "Garantia Vruumoto",
  guaranteeDescription: "Peça 100% compatível com a sua moto ou devolução gratuita em até 7 dias.",
  theme: {
    primaryHex: "#EE4D2D",          // Laranja de alta conversão + detalhes em Carbono (#18181B)
    headerGradientStart: "#E63917",
    headerGradientEnd: "#FF5E2B",
    secondaryLightBg: "rgba(238, 77, 45, 0.08)",
  },
  features: {
    enableVehicleFitmentFilter: true, // ATIVA o seletor "Serve na Minha Moto?"
    enableOemPartNumberSearch: true,  // ATIVA busca por Código OEM / Part Number
    enableHyperlocalCityBadge: true,  // ATIVA "Receba Hoje na Oficina / Sua Cidade"
  },
};
```

---

## 3. Funcionalidades Exclusivas de Motopeças (Ativadas apenas na `brand/vruumoto`)

### A) Componente "Minha Garagem / Serve na Minha Moto?" (`<MotorcycleFitmentBar />`)
No mercado de peças de moto, a maior barreira de compra é a dúvida se a peça serve no modelo/ano exato da moto.
1. **Na Home (abaixo do Hero Banner) e no Topo da PDP:**
   * Exibe uma barra interativa com 3 *dropdowns* encadeados:
     * **1. Montadora:** `Honda`, `Yamaha`, `Bajaj`, `Suzuki`, `Haojue`, `Shineray`, `BMW`, `Kawasaki`.
     * **2. Modelo:** (ex: ao escolher Honda -> `CG 160 Titan`, `CG 160 Fan`, `CG 160 Start`, `NXR 160 Bros`, `Biz 125`, `PCX 160`, `CB 300F Twister`, `XRE 300 / Sahara 300`).
     * **3. Ano:** `2026`, `2025`, `2024`, `2023`, `2022`, `2021`, `2020`, `2019`, `2018`...
2. **Selo de Compatibilidade Automático na PDP:**
   * Quando o cliente seleciona sua moto (ex: `Honda CG 160 Titan 2024` salvo em `localStorage`), todas as páginas de produto exibem um banner verde ou vermelho imediato:
     * ✅ **`SERVE NA SUA MOTO: Compatível com Honda CG 160 Titan (2016 a 2026)`**
     * ⚠️ **`ATENÇÃO: Esta peça NÃO é compatível com Honda CG 160 Titan 2024. [Ver peças compatíveis]`**

### B) Metadados Técnicos no Medusa v2 (`apps/backend/src/modules/motorcycle-fitment`)
Cada produto/variante na branch `brand/vruumoto` armazena nos metadados estruturados:
* `oem_part_number`: Código original da montadora / fabricante (ex: `06410-KVS-J00` / ` KM-9182`).
* `ean_barcode`: Código de barras EAN-13 para leitura instantânea com pistola laser no **PDV Físico (`/app/pdv`)** do balcão da loja de motopeças.
* `compatible_motorcycles`: Array de objetos `{ make, model, year_start, year_end }`.
* `viscosity_or_spec`: Para óleos, pneus e relações (ex: `10W30 Semissintético`, `90/90-18 Sem Câmara`, `Aço 1045 com Retentor O-Ring`).

### C) Atalhos Rápidos da Home para Motociclistas e Motoboys
Substitua os ícones genéricos da barra de serviços rápidos pelos ícones do universo **Vruumoto**:
1. `⛓️ Kit Relação`
2. `🛞 Pneus & Câmaras`
3. `🪖 Capacetes & Jaquetas`
4. `🛢️ Óleos & Filtros`
5. `🛑 Freios (Pastilha/Lona)`
6. `⚡ Entrega Expressa Motoboy`

---

## 4. Script Seed de Catálogo Vruumoto (`src/scripts/seed-vruumoto.ts`)

Popule a branch `brand/vruumoto` com produtos âncora reais do mercado brasileiro de motopeças:

1. **Produto Âncora 1 (Destaque do Simulador e Testes):**
   * **Título:** `Kit Relação Transmissão Aço 1045 com Retentor O-Ring Vruumoto Original`
   * **Preço Original:** `R$ 189,90` | **Preço Promocional:** `R$ 113,94` (`-40% OFF`) | **Preço no Pix (10% OFF):** `R$ 102,55`
   * **Variações de Aplicação (SKU):**
     * `Honda CG 160 Titan/Fan/Start (2016-2026)` — Disponível (Estoque: 85 unid.)
     * `Honda NXR 160 Bros / XRE 190` — Disponível (Estoque: 42 unid.)
     * `Yamaha Fazer 250 / Lander 250` — Disponível (Estoque: 19 unid.)
     * `Honda CB 300F Twister` — Esgotado (`inventory_quantity: 0`, demonstrando o estado bloqueado na PDP)
2. **Produto Âncora 2:**
   * **Título:** `Capacete Fechado Aerodinâmico Viseira Solar Interna Dupla Vruumoto Pro`
   * **Variações:** Cores (`Preto Fosco`, `Vermelho Racing`, `Grafite Titanium`) e Tamanhos (`56`, `58`, `60`, `62`).
3. **Produto Âncora 3:**
   * **Título:** `Pneu Traseiro 90/90-18 Sem Câmara Alta Durabilidade Urbano/Motoboy`
4. **Produto Âncora 4:**
   * **Título:** `Kit 4 Litros Óleo Motor 10W30 Semissintético 4T + Filtro de Óleo`

---

## 5. Ativos Visuais da Branch `brand/vruumoto` (`public/images/vruumoto-assets/`)

No pacote ZIP já estão incluídas as imagens geradas pelo motor visual do Gemini tanto para a `main` quanto para a `brand/vruumoto`:
* `public/images/vruumoto-assets/banners/hero-vruumoto-01.jpg`: Banner Hero 16:9 com capacete 3D, disco de freio, corrente dourada, amortecedor e moedas.
* `public/images/vruumoto-assets/products/kit-relacao-freio-01.jpg`: Foto de estúdio 1:1 do Kit Relação com Coroa em Aço, Corrente Dourada e Disco de Freio Ventilado.

---

## 6. Critérios de Aceite do `@QAReviewer` para a Etapa 5 (`brand/vruumoto`)

- [ ] Executar `git diff main..brand/vruumoto` confirma que a branch `main` permaneceu 100% limpa e genérica, e que todas as customizações da **Vruumoto** estão isoladas na branch `brand/vruumoto`.
- [ ] O filtro *"Serve na Minha Moto?"* filtra corretamente os produtos para `Honda -> CG 160 Titan -> 2024` e exibe o badge verde de compatibilidade na PDP.
- [ ] No PDV Físico (`/app/pdv`), digitar ou bipar o código OEM ou EAN da peça adiciona imediatamente o Kit Relação ao caixa da loja física.
