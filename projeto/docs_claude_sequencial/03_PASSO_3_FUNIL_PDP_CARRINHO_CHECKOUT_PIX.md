# 03 — PASSO 3: FUNIL DE COMPRA COMPLETO (PDP, CARRINHO MULTI-LOJISTA, CHECKOUT E PIX)

> **Agente Responsável:** `@FrontendShopee` (em integração com `@BackendMedusa`)  
> **Agente Revisor:** `@QAReviewer`  
> **Referência Visual e Funcional:** `simulador_funil_compra_shopee.html` e `guia_passo_a_passo_funil_shopee.md`

---

## 1. Página de Detalhes do Produto — PDP (`/produtos/[handle]`)

### A) Layout Desktop (12 Colunas: 5 Esquerda + 7 Direita)
1. **Coluna Esquerda — Galeria de Mídia (5 colunas, `~480px`):**
   * **Quadro Principal 1:1 (`450px x 450px`):** Suporte a **Lupa de Zoom Ótico** no movimento do mouse (`onMouseMove` calculando coordenadas percentuais `X, Y` para ampliar a foto em alta resolução).
   * **Carrossel de Miniaturas Inferior:** Troca a foto principal instantaneamente ao passar o mouse (`onMouseEnter`) ou clicar, aplicando borda `2px solid #EE4D2D` na miniatura ativa.
   * **Barra Social e Favoritos:** Compartilhamento rápido (WhatsApp, Facebook) e contador de favoritos interativo (`♡ Favoritar (3.421)`).
2. **Coluna Direita — Identidade, Preço, Matriz de SKU e Ações (7 colunas, `~700px`):**
   * **Título + Selo Oficial:** Badge `Oficial` seguido do nome completo do produto e linha de prova social (`4.8 ★★★★★ | 2,3 mil avaliações | 8,4 mil vendidos`).
   * **Bloco de Preços (`bg-[#FAFAFA] p-4 rounded`):**
     * Preço original riscado (`R$ 89,90`), Preço atual em `30px` `#EE4D2D` (`R$ 53,94`) e tag `40% OFF`.
     * Linha verde de **Desconto Pix**: `R$ 48,55 com Desconto Pix de 10% exclusivo`.
     * Parcelamento: `em até 3x R$ 17,98 sem juros no cartão`.
   * **Máquina de Estados de Variações (SKU Matrix — Cores e Tamanhos):**
     * **Estado 1 — Padrão (Disponível):** Fundo `#FFFFFF`, borda `1px solid rgba(0,0,0,0.09)`, texto `#222222`. Hover muda borda para `#EE4D2D`.
     * **Estado 2 — Selecionado (Ativo):** Borda `1px solid #EE4D2D`, texto `#EE4D2D` em negrito, e **triângulo laranja no canto inferior direito com check `✓`** (classe `.check-triangle`). Ao clicar numa cor, a foto principal da galeria muda imediatamente para a foto daquela variação.
     * **Estado 3 — Esgotado (`inventory_quantity === 0`, ex: Tamanho G):** Fundo `#F5F5F5`, borda tracejada `#D1D5DB`, texto apagado `#D1D5DB`, cursor `not-allowed` e clique bloqueado.
   * **Calculadora de Frete por CEP:** Input de CEP com máscara `00000-000`, botão `Calcular` que consulta o endpoint `/store/shipping/cep`, exibindo cidade/UF, prazo de entrega e selo verde `🚚 Frete Grátis com cupom`.
   * **Seletor de Quantidade (`-` / `1` / `+`) + Estoque Disponível:** Impede selecionar quantidade superior ao estoque real da variante.
   * **Dupla de Botões de Ação (CTAs):**
     * `Adicionar ao Carrinho`: Fundo `#FFF5F1`, borda `1px solid #EE4D2D`, texto `#EE4D2D`. Dispara mutação assíncrona no carrinho, exibe **Modal Toast Central** (`"✓ O produto foi adicionado ao seu carrinho!"` com *fade-out* de 1,8s) e anima o contador do carrinho no Header.
     * `Comprar Agora`: Fundo sólido `#EE4D2D`, texto branco. Adiciona o item e redireciona diretamente para `/checkout`.

### B) Adaptação Exclusiva da PDP no Mobile (`< 768px`)
* No celular, os botões de compra ficam em uma **Barra de Ação Fixa no Rodapé (`fixed bottom-0 left-0 right-0 z-50`)** dividida em:
  * Esquerda: `💬 Chat` (verde teal) e `🛒 Carrinho` (com badge numérico).
  * Direita: `Adicionar` (laranja claro) e `Comprar` (laranja sólido `#EE4D2D`).
* Ao tocar em *"Adicionar"* ou *"Comprar"* no celular, abre-se o **Bottom Sheet Drawer (Gaveta Deslizante de Baixo para Cima)** sobre um backdrop escuro (`bg-black/60`), exibindo miniatura 1:1 da variante, preço, estoque e os botões de Cor e Tamanho para escolha com o polegar antes de confirmar.

### C) Bloco do Vendedor, Tabela de Atributos e Avaliações com Filtros
* Abaixo da dobra na PDP, renderize:
  1. **Card do Vendedor / Loja:** Avatar, nome da loja (`Lovito Brasil Oficial`), status online, botões `💬 Conversar Agora` e `Ver Página da Loja`, mais grade de 6 métricas (Avaliações, Taxa de Resposta, Tempo de Resposta, Produtos, Desde, Seguidores).
  2. **Ficha Técnica e Descrição:** Tabela estruturada de especificações (Categoria, Estoque, Material, Origem, Envio de) seguida do texto descritivo.
  3. **Módulo de Avaliações de Clientes:** Nota média `4.8 de 5` + botões de filtro rápido (`Todas`, `5 Estrelas`, `4 Estrelas`, `Com Comentários`, `Com Fotos/Vídeos`) e lista de avaliações com nomes mascarados por privacidade (`j*****3`), variação comprada e miniaturas de fotos reais dos clientes.

---

## 2. Página do Carrinho de Compras (`/cart`)

Construa a tela `/cart` seguindo o modelo de **Carrinho Multi-Lojista Agrupado**:
1. **Cabeçalho da Tabela (Desktop):** Checkbox Mestre `Selecionar Tudo`, colunas `Produto`, `Preço Unitário`, `Quantidade`, `Preço Total` e `Ações`.
2. **Agrupamento por Loja / Estoque:**
   * Cada grupo exibe o cabeçalho da loja (`[☑] [Oficial] Lovito Brasil Oficial | 💬 Conversar`) e a faixa de cupom da loja aplicado (`Cupom da Loja Aplicado: R$ 5,00 OFF`).
   * **Troca Rápida de Variação no Carrinho:** Ao lado do produto, um seletor permite trocar a cor/tamanho (`Variação: Preto, M ▾`) sem precisar voltar à PDP.
3. **Faixa de Benefícios da Plataforma:**
   * Linha de **Cupom Shopee**: Mostra o status `Cupom de Frete Grátis Ativo ✓` e modal para aplicar códigos promocionais.
   * Linha de **Moedas Shopee**: Mostra o saldo do comprador (`Saldo: 450 moedas = R$ 4,50`) com um `checkbox` / `switch` interativo (`Resgatar [-R$ 4,50]`) que recalcula o total do carrinho em tempo real.
4. **Barra Fixa Inferior do Carrinho (`sticky bottom-0`):**
   * Permanece colada na base da tela durante a rolagem, exibindo o checkbox `Selecionar Tudo`, o valor total em destaque (`R$ 44,44`), a linha verde de economia total (`Economia total de R$ 49,96 com cupons e moedas`) e o botão primário `Finalizar Compra`.

---

## 3. Página de Checkout (`/checkout`)

1. **Borda Decorativa de Envelope Postal:** No topo do bloco de endereço, renderize a faixa listrada diagonal em azul e vermelho clássico de correio aéreo:
   ```css
   .postal-border {
     background-image: repeating-linear-gradient(45deg, #6FA6D6, #6FA6D6 33px, transparent 0, transparent 41px, #F18D9B 0, #F18D9B 74px, transparent 0, transparent 82px);
     height: 3px;
   }
   ```
2. **Bloco de Endereço de Entrega:** Exibe nome completo, telefone, endereço completo com CEP, tag `Padrão` e modal para `Trocar` ou cadastrar novo endereço com busca automática por CEP.
3. **Revisão dos Pacotes e Opção de Envio:** Lista os itens comprados, campo de *"Mensagem para o Vendedor"*, seletor de modalidade de frete (`Padrão` vs `Expresso Local`) e o abatimento verde `R$ 14,90 -> R$ 0,00 (Frete Grátis com cupom)`.
4. **Acordeão de Métodos de Pagamento Reativo:**
   * 4 botões selecionáveis: `⚡ PIX (10% OFF EXTRA)`, `💳 Cartão de Crédito (Até 3x sem juros)`, `📄 Boleto Bancário`, `👛 Carteira Digital`.
   * Quando **PIX** está selecionado, o resumo financeiro inclui a linha `Desconto Pix Exclusivo (10%): - R$ 5,39`, reduzindo o total final para **`R$ 39,05`**. Se o usuário mudar para Cartão ou Boleto, o resumo recalcula instantaneamente para `R$ 44,44`.
5. **Resumo Financeiro Detalhado:** Exibe linha por linha:
   * Subtotal dos Produtos (`R$ 53,94`)
   * Total do Frete (`R$ 14,90`)
   * Desconto de Frete (`- R$ 14,90`)
   * Cupom do Vendedor (`- R$ 5,00`)
   * Desconto Pix Exclusivo (`- R$ 5,39`)
   * Moedas Resgatadas (`- R$ 4,50`)
   * **Pagamento Total (`R$ 39,05`)** + Botão `Fazer Pedido ->`.

---

## 4. Tela de Pedido Realizado e Pagamento Pix (`/pedido/[id]/sucesso`)

Ao clicar em *"Fazer Pedido"*:
1. Dispara a finalização do carrinho no Medusa (`POST /store/carts/:id/complete`).
2. Renderiza a tela de confirmação contendo:
   * Número único do pedido (ex: `2610188472910A`) e cronômetro regressivo de expiração do Pix (`01:59:45`).
   * **QR Code Dinâmico do Pix** renderizado nitidamente em `<canvas>` ou SVG a partir do payload EMV retornado pelo módulo de pagamento.
   * **Campo Pix Copia e Cola** com botão `Copiar` acionando `navigator.clipboard.writeText()` e disparando o Toast `"Código Pix Copia e Cola copiado!"`.
   * **Escuta em Tempo Real (SSE / WebSocket):** Indicador pulsante *"Aguardando liquidação bancária automática..."* conectado ao endpoint de status do pedido, acompanhado de um botão de homologação `"Simular Confirmação de Pagamento"` que dispara o webhook local e atualiza a tela para **"✅ Pagamento Pix Compensado!"**.

---

## 5. Critérios de Aceite do `@QAReviewer` para a Etapa 3

- [ ] Na PDP, clicar nas variações `Preto`, `Bege` e `Terracota` atualiza o selo `.check-triangle`, o rótulo da foto principal e o estado do carrinho; o tamanho `G` permanece bloqueado (`disabled`).
- [ ] No modo Mobile (`375px`), clicar em `Adicionar` ou `Comprar` na barra fixa inferior abre a gaveta deslizante (*Bottom Sheet Drawer*) de seleção de SKU.
- [ ] A matemática financeira entre PDP, Carrinho e Checkout bate centavo por centavo (`R$ 53,94` -> `R$ 44,44` no carrinho -> `R$ 39,05` no checkout com Pix).
- [ ] O QR Code do Pix é desenhado no `<canvas>` e o botão de simulação de webhook confirma o pagamento sem recarregar a página.
