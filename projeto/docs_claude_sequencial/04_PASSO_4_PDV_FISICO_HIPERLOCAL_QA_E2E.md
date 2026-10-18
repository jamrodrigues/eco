# 04 — PASSO 4: PDV PONTO FÍSICO, EXPANSÃO HIPERLOCAL (FRANQUEADOS), ATIVOS VISUAIS E QA E2E

> **Agente Responsável:** `@POSHyperlocal` & `@QAReviewer`  
> **Supervisor Final:** `@TechLead`

---

## 1. Módulo de Ponto de Venda Físico — PDV (`/app/pdv` no Medusa Admin)

Como a operação começa com uma loja única integrada ao ponto físico, o `@POSHyperlocal` deve criar uma **Admin UI Route customizada** dentro do próprio painel do [Medusa Admin](https://docs.medusajs.com/learn/fundamentals/admin/routing) (`apps/backend/src/admin/routes/pdv/page.tsx`):

### Funcionalidades da Tela de PDV Físico:
1. **Leitura de Código de Barras (EAN / SKU Scanner):**
   * Campo de busca com foco automático (`autoFocus`) que detecta a leitura rápida de leitores USB/Bluetooth de código de barras (disparo de `Enter` após sequência numérica) e adiciona a variação exata do produto na cesta do caixa imediatamente.
2. **Sincronização em Tempo Real com o Estoque da Loja Física:**
   * Consulta e deduz a quantidade diretamente do `Stock Location: Loja Física Matriz`. Se o último vestido tamanho `M` for vendido no balcão da loja física, o site/app atualiza o estoque em tempo real para evitar venda duplicada.
3. **Fechamento Rápido de Balcão:**
   * Opções rápidas de pagamento presencial: `Pix QR Code na Tela`, `Cartão Débito/Crédito (Maquininha)`, `Dinheiro (com cálculo de troco)`.
   * Botão `Emitir Recibo Térmico (80mm)`: Abre janela de impressão formatada (`@media print` em `80mm`) para impressoras térmicas de balcão (Bematech / Elgin / Epson).

---

## 2. Arquitetura Hiperlocal para Futuros Lojistas / Franqueados por Cidade

Para preparar o sistema para a **Fase 2 (múltiplos lojistas ou franqueados entregando na sua própria cidade)** sem precisar refazer o projeto no futuro:

1. **Modelo de Dados de Franqueado / Vendedor Local (`src/modules/franchise-hyperlocal`):**
   * Cria a tabela `franchise_unit` vinculada nativamente ao `stock_location_id` do Medusa v2:
     * `id`, `name` (ex: *"Unidade Recife / Jaboatão"*), `city`, `state`, `cep_prefix_start`, `cep_prefix_end`, `recipient_pagarme_id` (ID da conta bancária do franqueado para receber o Split automático), `commission_rate` (percentual que fica para a plataforma matriz).
2. **Middleware de Roteamento por CEP (`src/api/middlewares/hyperlocal-context.ts`):**
   * Quando o cliente informa o CEP no cabeçalho ou na PDP, o sistema verifica se existe uma `franchise_unit` cobrindo aquela faixa de CEP.
   * Caso exista, prioriza o estoque daquela unidade local, ativa o selo **`⚡ Entrega Hoje na Sua Cidade`** no card do produto e direciona o *Split de Pagamento* do pedido para o franqueado responsável pela entrega local.

---

## 3. Contrato do Manifesto de Imagens (`public/assets/manifest.json`)

Para que o motor de geração de imagens do **Gemini** trabalhe em conjunto com o código do **Claude**, o `@FrontendShopee` deve ler os ativos visuais a partir de `apps/storefront/public/assets/manifest.json`:

```json
{
  "banners": {
    "hero_main_1": {
      "src": "/images/shopee-assets/banners/hero-main-01.png",
      "alt": "Campanha Frete Grátis Sem Mínimo - Ofertas Relâmpago",
      "aspectRatio": "16:9"
    },
    "side_banner_1": {
      "src": "/images/shopee-assets/banners/side-top-01.png",
      "alt": "Cupons Diários de até R$ 50 OFF",
      "aspectRatio": "16:9"
    }
  },
  "products": {
    "vestido_lovito_preto": {
      "src": "/images/shopee-assets/products/prod-01-main.png",
      "alt": "Vestido Midi Canelado Lovito Gola Alta Elegante",
      "aspectRatio": "1:1"
    }
  }
}
```

---

## 4. Bateria de Auditoria e Testes E2E do `@QAReviewer` (Playwright)

O `@QAReviewer` deve criar o arquivo `apps/storefront/e2e/shopee-funnel.spec.ts` utilizando **Playwright** e executar os seguintes testes obrigatórios antes do `@TechLead` encerrar o projeto:

1. **Teste 1 — Fidelidade Visual Desktop (`1200x800`):**
   * Verifica se o Header possui gradiente laranja e `position: sticky`, se o bloco de *Ofertas Relâmpago* está ativo e se a grade *Descobertas do Dia* possui 6 colunas.
2. **Teste 2 — Fidelidade Responsiva Mobile (`375x812` — iPhone SE/14):**
   * Verifica se a grade de produtos cai para 2 colunas, se a barra de navegação inferior de 5 abas está fixa no rodapé e se a PDP abre a gaveta deslizante (*Bottom Sheet*) ao tocar em `Adicionar`.
3. **Teste 3 — Jornada Completa de Compra até o Pix:**
   * Navega da Home -> Clica no *Vestido Midi Lovito* -> Seleciona Cor `Bege` e Tamanho `M` -> Adiciona ao Carrinho -> Vai para `/cart` -> Ativa Cupom de Frete Grátis + Moedas -> Vai para `/checkout` -> Seleciona `PIX (10% OFF EXTRA)` -> Confirma que o total é `R$ 39,05` -> Clica em `Fazer Pedido` -> Verifica se o `<canvas>` do QR Code Pix foi renderizado e se o botão `Copiar` copia a chave EMV.
4. **Teste 4 — Sincronização do PDV Físico:**
   * Simula uma venda presencial no endpoint `/admin/pdv/checkout` e verifica se o estoque disponível na PDP do Storefront diminuiu em 1 unidade imediatamente.
