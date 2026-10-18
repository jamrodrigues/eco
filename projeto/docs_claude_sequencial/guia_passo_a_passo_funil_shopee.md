# Guia Passo a Passo e Mapeamento Visual de Front-End: Da Página de Produto (PDP) até a Emissão do Pedido na Shopee Brasil

Este documento apresenta a demonstração estruturada de todas as telas, componentes visuais, interações em JavaScript/CSS e chamadas de rede que compõem o funil de compra da [Shopee Brasil](https://www.google.com/search?q=https%3A%2F%2Fshopee.com.br%2F), cobrindo a jornada de ponta a ponta desde a Página de Detalhes do Produto (PDP) até a tela de pagamento e confirmação do pedido.

---

## 1. Tela 1: Página de Detalhes do Produto (PDP - Product Detail Page)

### Wireframe Estrutural da Interface (Desktop 1200px)
```
+---------------------------------------------------------------------------------------------------+
|  [Header Sticky Shopee - 119px: Logo | Barra de Busca Centralizada (840px) | Mini-Cart Popover]   |
+---------------------------------------------------------------------------------------------------+
|  Breadcrumb: Shopee > Roupas Femininas > Vestidos > Vestido Midi Lovito                           |
+---------------------------------------------------+-----------------------------------------------+
|  COLUNA ESQUERDA: GALERIA DE MÍDIA (~480px)       |  COLUNA DIREITA: DADOS E AÇÕES (~700px)       |
|                                                   |                                               |
|  +---------------------------------------------+  |  [Selo OFICIAL] Lovito Vestido Midi Canelado  |
|  |                                             |  |  ★ 4.8 (2,3 mil avaliações) | 8,4 mil vendidos |
|  |         FOTO PRINCIPAL 1:1 (450px)          |  +-----------------------------------------------+
|  |     (Com Lupa de Zoom Ótico no Hover)       |  |  PAINEL DE PREÇOS (Fundo #FAFAFA):            |
|  |                                             |  |  De: R$ 89,90  (-40% OFF)                     |
|  +---------------------------------------------+  |  Por: R$ 53,94 em até 3x R$ 17,98 sem juros   |
|                                                   |  Preço no Pix: R$ 48,55 (com Desconto Pix)    |
|  [<] [Thumb 1] [Thumb 2] [Thumb 3] [Thumb 4] [>]  +-----------------------------------------------+
|                                                   |  Cupons da Loja: [ R$ 5 OFF acima de R$ 50 ]  |
|  Compartilhar: [WhatsApp] [Facebook] [Twitter]    +-----------------------------------------------+
|  Favoritar: [ ♡ 3.421 ]                           |  Cores: [ Preto ✓ ]  [ Bege ]  [ Terracota ]  |
|                                                   |  Tamanhos: [ P ]  [ M ✓ ]  [ G (Esgotado ⊘) ] |
|                                                   +-----------------------------------------------+
|                                                   |  Frete: [ 🚚 Frete Grátis com cupom ]        |
|                                                   |  Para: São Paulo, SP (Previsão: 24 a 28 Out)  |
|                                                   +-----------------------------------------------+
|                                                   |  Quantidade: [ - ] [ 1 ] [ + ]  (142 disp.)   |
|                                                   +-----------------------------------------------+
|                                                   |  [ 🛒 Adicionar ao Carrinho ]  [ COMPRAR AGORA ]
+---------------------------------------------------+-----------------------------------------------+
|  PERFIL DO VENDEDOR: [Avatar] Lovito Oficial ★ 4.9 | Chat: 98% (horas) | Produtos: 1.200 | [Chat]  |
+---------------------------------------------------------------------------------------------------+
|  DESCRIÇÃO DO PRODUTO: Tabela de Atributos (Composição, Origem, Guia de Medidas)                  |
+---------------------------------------------------------------------------------------------------+
|  AVALIAÇÕES: Nota 4.8 | Filtros: [Todas] [5★] [4★] [Com Comentários] [Com Fotos/Vídeos]           |
|  - j*****3: "Caimento perfeito, tecido encorpado!" [Foto 1] [Foto 2]                              |
+---------------------------------------------------------------------------------------------------+
```

### Componentes Chave e Comportamentos Técnicos
* **Galeria de Fotos com Zoom e Carrossel**: A imagem principal quadrada de `450px x 450px` detecta o movimento do mouse (`onMouseMove`) para projetar a lupa de zoom óptico em alta definição (`1200px`), enquanto o carrossel inferior substitui a imagem instantaneamente no evento `onMouseEnter` sobre as miniaturas.
* **Máquina de Estados de SKU (Cores e Tamanhos)**:
  * *Padrão (Inativo)*: Fundo branco e borda neutra `1px solid rgba(0,0,0,0.09)`.
  * *Selecionado (Ativo)*: Borda laranja `1px solid #EE4D2D`, texto em `#EE4D2D` e triângulo com check `✓` no canto inferior direito.
  * *Esgotado (Disabled)*: Fundo cinza `#F5F5F5`, cursor `not-allowed`, texto apagado e clique bloqueado.
* **Painel de Preços e Desconto Pix**: Preço antigo riscado (`line-through`), preço promocional em `30px` na cor `#EE4D2D` e sinalização da tag [Desconto Pix](https://www.google.com/search?q=https%3A%2F%2Fhelp.shopee.com.br%2Fportal%2F4%2Farticle%2F197770-%5BDesconto-Pix%5D-Como-funciona-o-desconto-para-pagamento-via-Pix).
* **Calculadora de Frete Assíncrona**: Consulta imediata de CEP com retorno das transportadoras e prazo estimado, destacando em verde as regras de [Cupom de Frete Grátis](https://www.google.com/search?q=https%3A%2F%2Fhelp.shopee.com.br%2Fportal%2F4%2Farticle%2F76300-%5BFrete-Gr%25C3%25A1tis%5D-Como-utilizar-meu-cupom-de-frete-gr%25C3%25A1tis).

---

## 2. Tela 2: Modal de Feedback e Interação de Adição ao Carrinho

Ao clicar no botão primário *"Adicionar ao Carrinho"*, o front-end executa:
1. **Mutação Assíncrona**: Chamada HTTP `POST /api/v4/cart/add_to_cart` enviando `{ item_id, shop_id, model_id, quantity: 1 }`.
2. **Toast de Feedback**: Surge uma caixa flutuante semitransparente no centro da tela com o ícone verde de sucesso e a mensagem *"O produto foi adicionado ao seu carrinho de compras"*, sumindo suavemente após 1,5 segundo (`fade-out`).
3. **Animação de Ícone no Header**: O badge numérico sobre o ícone do carrinho no cabeçalho sticky sofre uma animação CSS de pulsação (`scale(1.3) -> scale(1.0)`) e incrementa o contador.

---

## 3. Tela 3: Página do Carrinho de Compras (`https://shopee.com.br/cart`)

### Wireframe Estrutural do Carrinho Multi-Lojista
```
+---------------------------------------------------------------------------------------------------+
|  [Header Simplificado: Logo Shopee | "Carrinho de Compras" | Barra de Pesquisa Rápida]            |
+---------------------------------------------------------------------------------------------------+
|  [ ☑ ] PRODUTO                         | PREÇO UNIT. | QUANTIDADE | PREÇO TOTAL | AÇÕES           |
+---------------------------------------------------------------------------------------------------+
|  BLOCO LOJA 1: [ ☑ ] [Oficial] Lovito Brasil Oficial              [ 💬 Conversar ] [ Ver Loja ]   |
|  +---------------------------------------------------------------------------------------------+  |
|  | [ ☑ ] [Foto 1:1] Vestido Midi Lovito   | R$ 53,94    | [-] [ 1 ] [+]| R$ 53,94    | [Excluir]       |
|  |      Variação: [ Preto, M ▾ ]          | (De R$89,90)|            |             | [Similar]       |
|  +---------------------------------------------------------------------------------------------+  |
|  | 🏷️ Cupom da Loja: [ R$ 5 OFF em compras acima de R$ 50 ] -> [ APLICADO COM SUCESSO ✓ ]        |
+---------------------------------------------------------------------------------------------------+
|  BLOCO LOJA 2: [ ☐ ] [Indicado] Eletrônicos Brasil                [ 💬 Conversar ] [ Ver Loja ]   |
|  +---------------------------------------------------------------------------------------------+  |
|  | [ ☐ ] [Foto 1:1] Fone Bluetooth 5.3    | R$ 79,90    | [-] [ 1 ] [+]| R$ 79,90    | [Excluir]       |
|  |      Variação: [ Branco ▾ ]            |             |            |             | [Similar]       |
+---------------------------------------------------------------------------------------------------+
|  CUPONS E BENEFÍCIOS DA PLATAFORMA:                                                               |
|  [ 🎫 Cupom Shopee: Frete Grátis Aplicado ✓ ] [ Selecionar Cupom de Desconto da Plataforma ]      |
|  [ ☑ ] Resgatar Moedas Shopee (Saldo: 450 moedas = - R$ 4,50)                                     |
+---------------------------------------------------------------------------------------------------+
|  BARRA FIXA INFERIOR (Sticky Bottom):                                                             |
|  [ ☑ ] Selecionar Tudo (1 item selecionado)   | Economia Total: R$ 40,46                          |
|  Subtotal: R$ 53,94 - Descontos: R$ 9,50      | TOTAL: R$ 44,44          [ FINALIZAR COMPRA > ]   |
+---------------------------------------------------------------------------------------------------+
```

### Particularidades de Engenharia de Front-End no Carrinho
* **Agrupamento por Vendedor (Multi-Vendor Split)**: Produtos são visualmente e logicamente agrupados pela loja vendedora ([Compra de Vários Vendedores](https://www.google.com/search?q=https%3A%2F%2Fhelp.shopee.com.br%2Fportal%2F4%2Farticle%2F76326-%5BNovo-na-Shopee%5D-Como-posso-comprar-v%25C3%25A1rios-produtos-de-diferentes-vendedores-no-mesmo-pedido)). O checkbox mestre do lojista marca ou desmarca todos os itens correspondentes em uma única operação.
* **Dropdown de Troca Rápida de SKU**: Clicando na variação (ex.: `[ Preto, M ▾ ]`), o comprador altera tamanho ou cor diretamente dentro do carrinho sem retornar à página do anúncio.
* **Tripla Aplicação Concorrente de Benefícios**:
  1. *Cupom do Vendedor*: Deduz R$ 5,00 da loja Lovito.
  2. *Cupom de Frete Grátis da Shopee*: Zera ou reduz o frete logístico da entrega.
  3. *Cupom de Desconto Shopee*: Abate percentual sobre o subtotal.
  4. *Moedas Shopee*: Deduz saldo de moedas gamificadas na taxa de conversão oficial ([Moedas Shopee](https://www.google.com/search?q=https%3A%2F%2Fhelp.shopee.com.br%2Fportal%2F4%2Farticle%2F76257-%5BMoedas-Shopee%5D-O-que-s%25C3%25A3o-Moedas-Shopee)).
* **Barra Fixa Inferior (Sticky Footer)**: Exibe a economia total e o botão primário largo *"Finalizar Compra"*, fixado na base do navegador para conversão instantânea.

---

## 4. Tela 4: Finalização da Compra (Checkout - `https://shopee.com.br/checkout`)

### Barreira de Autenticação Prévia
Se o usuário tentar acessar o checkout sem estar autenticado, o front-end intercepta a rota e redireciona para `https://shopee.com.br/buyer/login?next=/checkout`, garantindo a amarração do pedido a uma conta válida.

### Wireframe Estrutural do Checkout
```
+---------------------------------------------------------------------------------------------------+
|  [Header Checkout: Logo Shopee | "Finalização da Compra" | Ambiente Seguro SSL 🔒]                |
+---------------------------------------------------------------------------------------------------+
|  [====================== Borda Decorativa Envelope Postal Vermelho/Azul =======================]  |
|                                                                                                   |
|  📍 ENDEREÇO DE ENTREGA                                                    [ Trocar / Editar ]    |
|  Maria da Silva (+55 11 98765-4321)                                                               |
|  Av. Paulista, 1000, Apto 42, Bela Vista, São Paulo - SP, CEP 01310-100                           |
+---------------------------------------------------------------------------------------------------+
|  REVISÃO DO PACOTE 1 (Loja: Lovito Brasil Oficial)                                                |
|  [Foto 1:1] Vestido Midi Lovito Canelado (Preto, M) | R$ 53,94 x 1 unid                          |
|  Mensagem para o Vendedor: [ Enviar com embalagem discreta, por favor...                        ] |
|                                                                                                   |
|  Opção de Envio: [ ● Padrão (R$ 14,90 - Chegará 24-28 Out) ]  [ ○ Expresso (R$ 22,90) ]          |
|  Desconto de Envio: - R$ 14,90 (Cupom de Frete Grátis Shopee Aplicado ✓)                          |
+---------------------------------------------------------------------------------------------------+
|  MÉTODO DE PAGAMENTO                                                                              |
|  [ ● PIX (Desconto Exclusivo) ]  [ ○ Cartão de Crédito ]  [ ○ Boleto ]  [ ○ ShopeePay / Maree ]   |
|                                                                                                   |
|  ℹ️ Pagamento via Pix: Aprovação imediata! Você receberá o QR Code e o código "Pix Copia e Cola"   |
|     após clicar em "Fazer Pedido". Conclua o pagamento dentro do prazo de 2 horas.               |
+---------------------------------------------------------------------------------------------------+
|  RESUMO FINANCEIRO DO PEDIDO:                                                                     |
|  Subtotal dos Produtos:                                                                  R$ 53,94 |
|  Total do Frete:                                                                         R$ 14,90 |
|  Desconto do Frete (Cupom Frete Grátis):                                               - R$ 14,90 |
|  Cupom do Vendedor:                                                                      - R$ 5,00 |
|  Desconto Pix Exclusivo:                                                                 - R$ 5,39 |
|  Moedas Shopee Resgatadas:                                                               - R$ 4,50 |
|  ------------------------------------------------------------------------------------------------ |
|  PAGAMENTO TOTAL:                                                        R$ 39,05                 |
|                                                                                                   |
|  [ Ao fazer seu pedido, você concorda com os Termos e Políticas da Shopee ]                       |
|                                                                                                   |
|                                                                           [ FAZER PEDIDO ]        |
+---------------------------------------------------------------------------------------------------+
```

### Funcionalidades Técnicas no Checkout
* **Validação de Endereço e Cobertura**: Caso a transportadora não atenda a região informada no CEP, o front-end emite mensagens de erro contextualizadas ([Opções de Envio no Checkout](https://www.google.com/search?q=https%3A%2F%2Fhelp.shopee.com.br%2Fportal%2F4%2Farticle%2F76280-%5BEntrega%5D-Por-que-n%25C3%25A3o-consigo-selecionar-uma-op%25C3%25A7%25C3%25A3o-de-envio-durante-a-finaliza%25C3%25A7%25C3%25A3o-da-compra)), permitindo cadastrar ou alternar endereços sem recarregar a tela.
* **Recálculo Reativo por Método de Pagamento**:
  * Ao selecionar **Pix**: O front-end deduz imediatamente a linha de [Desconto Pix](https://www.google.com/search?q=https%3A%2F%2Fhelp.shopee.com.br%2Fportal%2F4%2Farticle%2F197770-%5BDesconto-Pix%5D-Como-funciona-o-desconto-para-pagamento-via-Pix).
  * Ao selecionar **Cartão de Crédito**: Abre os campos de número, validade, CVV e seletor de parcelas com cálculo automático de juros pela adquirente.
  * Ao selecionar **Boleto Bancário**: Informa data de vencimento e tempo de compensação de 1 a 3 dias úteis ([Opções de Pagamento na Shopee](https://www.google.com/search?q=https%3A%2F%2Fhelp.shopee.com.br%2Fportal%2F4%2Farticle%2F76237-%5BNovo-na-Shopee%5D-Quais-op%25C3%25A7%25C3%25B5es-de-pagamento-s%25C3%25A3o-aceitas-pela-Shopee)).

---

## 5. Tela 5: Conclusão do Pedido e Liquidação Instantânea via Pix

Após o comprador clicar no botão primário *"Fazer Pedido"*, a aplicação desabilita o botão, exibe um spinner de carregamento e dispara a mutação `POST /api/v4/order/create`. Com a resposta de sucesso da transação, o usuário aterrissa na tela final de pagamento:

```
+---------------------------------------------------------------------------------------------------+
|  ✅ PEDIDO REALIZADO COM SUCESSO!  (Pedido nº 2610188472910A)                                     |
|  Valor a Pagar: R$ 39,05  |  Vencimento da Chave Pix: 01 hora e 58 minutos                        |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|                          +-----------------------------+                                          |
|                          |  [QR CODE DINÂMICO PIX]     |                                          |
|                          |   Renderizado em <canvas>   |                                          |
|                          |      ou SVG vetorial        |                                          |
|                          +-----------------------------+                                          |
|                                                                                                   |
|  Código Pix Copia e Cola:                                                                         |
|  [ 00020126580014br.gov.bcb.pix0136a629b1f2-shopee-brasil-checkout-261018... ]                   |
|                                                                                                   |
|  [ 📋 COPIAR CÓDIGO PIX ]  -> Dispara toast: "Código copiado com sucesso!"                        |
|                                                                                                   |
|  Status do Pagamento: ⏳ Aguardando confirmação bancária...                                        |
|  (Canal WebSocket / Polling HTTP escuta a compensação em tempo real)                              |
+---------------------------------------------------------------------------------------------------+
|  [ Ver Meus Pedidos ]                                                    [ Continuar Comprando ]  |
+---------------------------------------------------------------------------------------------------+
```

### Ciclo de Vida da Tela de Pagamento Pix
1. **Renderização do QR Code**: O código do Banco Central é gerado no backend e desenhado no navegador em `<canvas>` de alta resolução.
2. **Cópia com Um Clique**: O botão *"Copiar Código Pix"* invoca a API nativa do navegador `navigator.clipboard.writeText(pixString)`, exibindo feedback instantâneo ao comprador.
3. **Escuta Reativa de Liquidação**: Um canal assíncrono (WebSocket ou requisições regulares de polling a cada 3 segundos) monitora o webhook bancário. No milissegundo em que o banco confirma o recebimento, a tela é atualizada automaticamente para o status *"Pagamento Confirmado!"*, redirecionando o fluxo para a aba de acompanhamento logístico.
