# Pacote Completo: Fábrica de E-commerce White-Label (`main`) + Branch `brand/vruumoto` (Motopeças)

**Repositório Alvo:** `https://github.com/jamrodrigues/eco.git`

Este pacote está estruturado para que o Claude construa primeiro um **Core E-commerce/Marketplace 100% Genérico e Reutilizável (White-Label)** na branch `main` (para você reaproveitar em qualquer outro projeto futuro) e, em seguida, crie a branch separada `brand/vruumoto` com todas as especificidades da marca **Vruumoto (Peças e Acessórios de Moto)**.

## Estrutura do Pacote ZIP

1. `CLAUDE.md` — Arquivo raiz de orquestração automática dos 6 agentes (com a regra de separação `main` vs `brand/vruumoto`).
2. `docs_claude_sequencial/`
   - `00_PROMPT_MESTRE_CLAUDE_ORQUESTRADOR.md` (Prompt Mestre, configuração `brand.config.ts` White-Label e fluxo Git)
   - `01_PASSO_1_BACKEND_MEDUSA_PAGAMENTOS_BR.md` (Branch `main`: Docker, Medusa v2, Região BRL, Pagar.me Pix/Split, Frete CEP)
   - `02_PASSO_2_FRONTEND_SHOPEE_HOME_LOGIN_DESIGN_SYSTEM.md` (Branch `main`: Design System #EE4D2D, Header 119px, Home Desktop/Mobile, Login)
   - `03_PASSO_3_FUNIL_PDP_CARRINHO_CHECKOUT_PIX.md` (Branch `main`: PDP com Zoom 1:1, SKU Matrix, Bottom Sheet Mobile, Carrinho, Checkout e Pix)
   - `04_PASSO_4_PDV_FISICO_HIPERLOCAL_QA_E2E.md` (Branch `main`: PDV Ponto Físico `/app/pdv`, Franquias Hiperlocais por CEP e Testes E2E)
   - `05_PASSO_5_BRANCH_VRUUMOTO_MOTOPECAS.md` (Branch `brand/vruumoto`: Identidade Vruumoto, Filtro "Serve na Minha Moto?" por Marca/Modelo/Ano, Busca OEM/EAN e Catálogo de Motopeças)
   - `guia_passo_a_passo_funil_shopee.md` (Mapeamento de wireframes e fluxo de telas)
3. `referencia_front_end/`
   - `simulador_funil_compra_shopee.html` (Gabarito 1:1 em HTML/Tailwind com visão Desktop 1200px e Mobile 375px)
4. `relatorios_tecnicos_pdf/`
   - `relatorio_tecnico_ui_ux_shopee_brasil.pdf` (19 páginas)
   - `relatorio_tecnico_funil_compra_shopee.pdf` (12 páginas)
5. `public/images/`
   - `manifest.json` (Mapeamento de imagens para as branches `main` e `brand/vruumoto`)
   - `shopee-assets/` (Ativos genéricos para a branch `main`)
   - `vruumoto-assets/` (Banner Hero 16:9 de Motopeças + Foto 1:1 de Kit Relação/Disco de Freio para a branch `brand/vruumoto`)
