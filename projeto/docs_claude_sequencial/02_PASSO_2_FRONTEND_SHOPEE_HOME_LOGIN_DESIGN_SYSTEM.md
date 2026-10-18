# 02 — PASSO 2: DESIGN SYSTEM SHOPEE, HEADER STICKY, HOMEPAGE (DESKTOP & MOBILE) E LOGIN

> **Agente Responsável:** `@FrontendShopee`  
> **Agente Revisor:** `@QAReviewer`  
> **Referência Visual:** `simulador_funil_compra_shopee.html` e Relatórios Técnicos UI/UX

---

## 1. Tokens Visuais Obrigatórios (`tailwind.config.ts` e `globals.css`)

Configure no `apps/storefront/tailwind.config.ts` exatamente a paleta, tipografia e dimensões inspecionadas na Shopee Brasil:

### Paleta de Cores Semânticas:
* **Gradiente Principal do Header (Desktop):** `linear-gradient(-180deg, #F53D2D, #FF6633)`
* **Laranja Primário (Brand / Preços / CTAs / Bordas Ativas):** `#EE4D2D`
* **Laranja Claro (Fundo de Botão Secundário "Adicionar ao Carrinho" e Tags):** `rgba(255, 87, 34, 0.08)` (`#FFF5F1`)
* **Vermelho Selo "Loja Oficial" (Shopee Mall):** `#D0011B`
* **Amarelo Selo de Desconto (`-40% OFF`) e Estrelas:** `#FFD424` (texto em `#EE4D2D` ou `#7A2E0E`)
* **Verde Frete Grátis / Pix:** `#00BFA5` (Teal Shopee) e `#16A34A` (Badge Pix)
* **Superfície de Fundo da Aplicação (Canvas Cinza Claro):** `#F5F5F5`
* **Superfície de Cards e Blocos:** `#FFFFFF` com borda sutil `1px solid rgba(0, 0, 0, 0.09)`
* **Texto Primário:** `#222222` | **Texto Secundário:** `#757575`

### Tipografia e Densidade:
* **Família Tipográfica:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
* **Largura Máxima do Container Desktop:** `1200px` centralizado (`max-w-[1200px] mx-auto`).
* **Proibição de Modo Escuro:** A interface deve operar **100% em Light Mode (`#F5F5F5` / `#FFFFFF`)**, exatamente como a Shopee Brasil, para maximizar contraste de fotos de produtos e badges promocionais.

---

## 2. Arquitetura Responsiva Dual (Desktop 1200px vs. Mobile 375px)

O `@FrontendShopee` deve construir os componentes respondendo de forma adaptativa entre Desktop e Mobile, além de manter no topo um **Seletor de Simulação de Viewport (`💻 Desktop` vs `📱 Mobile 375px`)** em ambiente de homologação para que o dono da loja possa testar ambas as visões a qualquer momento:

| Componente da Home | Comportamento no Desktop (`>= 768px`, container `1200px`) | Comportamento no Mobile (`< 768px`, foco em `375px`) |
| :--- | :--- | :--- |
| **Header Superior** | Fixo (`sticky top-0 z-50`), altura exata de **`119px`**, dividido em Top Bar (`34px` com links de Central do Vendedor, Notificações, Idioma e Login) + Main Bar (`85px` com Logo, Barra de Busca de `840px` com palavras-chave populares abaixo e Ícone de Carrinho com popover no *hover*). | Barra compacta no topo que muda de transparente (sobre o banner) para fundo branco sólido ao rolar (`scrollY > 40`), contendo **Ícone de Câmera (Busca por Imagem)** dentro do input de busca + Ícones de Carrinho e Chat. |
| **Hero Banner** | Layout bipartido (**Proporção 2:1**): Carrossel rotativo principal à esquerda (`796px x 235px`) + 2 banners estáticos empilhados à direita (`398px x 115px` cada). | Carrossel *full-bleed* (100% da largura da tela) com suporte a gestos de deslizar (*touch swipe*) e indicadores paginados. |
| **Atalhos de Serviços** | Linha horizontal de ícones com legendas (Moedas, Cupons, Frete Grátis, Ofertas Relâmpago, Lojas Oficiais). | Carrossel horizontal deslizante (*horizontal touch scroll*) em 1 ou 2 linhas compactas. |
| **Ofertas Relâmpago** | Cabeçalho com cronômetro regressivo em tempo real (`HH : MM : SS` em caixas pretas `#000000` com dígitos brancos) + carrossel horizontal de 6 produtos com barra de progresso em formato de pílula com ícone de fogo (`🔥 82% VENDIDOS`). | Carrossel horizontal compacto mostrando 2,5 cards por vez para incentivar o *swipe* lateral com o polegar. |
| **Descobertas do Dia** | Cabeçalho fixo (`sticky top-[119px]`) + **Grade de 6 colunas** (`grid-cols-6 gap-2.5`). Cards de `~190px` de largura com hover que eleva o card (`-translate-y-0.5`), aplica borda `#EE4D2D` e revela barra inferior laranja *"Encontrar itens similares"*. | **Grade de 2 colunas** (`grid-cols-2 gap-2`) ocupando toda a tela, sem efeitos de hover, otimizada para clique direto. |
| **Navegação Inferior** | Rodapé institucional completo com links de atendimento, formas de pagamento, selos de segurança e QR Code do App. | **Bottom Navigation Bar fixa (`fixed bottom-0 z-50`)** estilo aplicativo nativo com 5 abas: `🏠 Início`, `🎬 Vídeo`, `🔴 Live`, `🔔 Notificações` e `👤 Eu`. |

---

## 3. Anatomia Exata do Card de Produto e Rolagem Infinita (`<ProductCard />`)

Cada card da grade *Descobertas do Dia* deve conter rigorosamente:
1. **Container de Imagem Quadrada (`aspect-square` 1:1):**
   * Carregamento progressivo (`loading="lazy"`) com placeholder `shimmer`.
   * **Canto Superior Esquerdo:** Badge `OFICIAL` (fundo `#D0011B`) ou `INDICADO` (fundo `#EE4D2D`) com `font-size: 10px` e `font-weight: 700`.
   * **Canto Superior Direito:** Flag amarela `#FFD424` com o percentual de desconto (`-40%`).
   * **Base da Imagem:** Faixa promocional sobreposta (overlay PNG/CSS de campanha, ex: *Frete Grátis* ou *Datas Duplas*).
2. **Corpo do Card (`p-2`):**
   * **Título:** Truncado rigorosamente em **2 linhas** (`line-clamp-2`), `font-size: 12px`, `line-height: 16px`, cor `#222222`.
   * **Tags Intermediárias:** Pílula com borda pontilhada laranja (`Cupom R$ 5 OFF`) ou tag verde (`Desconto Pix`).
   * **Rodapé do Card:** Preço em destaque (`R$ 53,94` em `#EE4D2D`, `16px`, `font-extrabold`) à esquerda e volume de vendas (`8,4 mil vendidos` em `#757575`, `11px`) à direita.
3. **Motor de Rolagem Infinita (`IntersectionObserver`):**
   * Ao atingir `300px` antes do fim da grade, dispara busca paginada na API do Medusa (`GET /store/products?limit=24&offset=N`), exibindo 6 cards *skeleton* durante o carregamento. Após 4 lotes automáticos, exibe botão *"Ver Mais"* para preservar memória no navegador.

---

## 4. Página de Autenticação e Login (`/login`)

Construa a rota `/login` (com redirecionamento automático `?next=/checkout` quando acionada a partir do funil de compra) contendo:
1. **Coluna Esquerda (Desktop):** Banner institucional em gradiente laranja/vermelho com proposta de valor (*"Na Shopee Compensa Mais — Frete Grátis e Cupons Diários"*).
2. **Coluna Direita (Card de Autenticação):**
   * Alternância instantânea no topo entre **Login com Senha** (Telefone / E-mail / Usuário) e **Login com QR Code** (gerado em `<canvas>` para leitura pelo App).
   * **Componente de Segurança Anti-Bot (Quebra-Cabeça Deslizante / Slider CAPTCHA):** Modal ou barra de verificação interativa onde o usuário desliza a peça ou valida o token antes de liberar a requisição de autenticação no Medusa Auth.
   * **Botões de Login Social:** Google, Facebook e Apple.

---

## 5. Critérios de Aceite do `@QAReviewer` para a Etapa 2

- [ ] No Desktop (`1200px`), o Header permanece fixo com `119px` de altura e a grade *Descobertas do Dia* renderiza exatamente 6 colunas alinhadas.
- [ ] No Mobile (`375px`), a grade muda para 2 colunas, a barra de navegação inferior fixa de 5 abas aparece na base da tela e o input de busca exibe o ícone de câmera.
- [ ] O cronômetro de *Ofertas Relâmpago* decrementa os segundos em tempo real sem causar re-renderizações desnecessárias na página.
- [ ] A tela `/login` alterna entre formulário de credenciais e QR Code em `<canvas>` e autentica o cliente na sessão do Medusa.
