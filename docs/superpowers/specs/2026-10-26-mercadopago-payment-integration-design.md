# Integração Mercado Pago (primário) + toggle de gateway ativo

## Intenção e porquê

O cliente final já opera com Mercado Pago fora da plataforma. O módulo de
pagamento atual (`pagarme-br`, criado na Fase 1) é uma **simulação local**:
gera PIX/boleto fake, não chama nenhuma API externa, e o webhook não valida
assinatura — serviu só para destravar dev/QA sem credencial.

Precisamos de uma integração real com o Mercado Pago (pix, cartão, boleto),
que passa a ser o gateway principal. O Pagar.me deixa de ser o gateway e
passa a ser **backup estrutural**: continua como está (stub), para poder ser
promovido a integração real depois, sem reescrever a arquitetura.

Além disso, o admin precisa poder alternar manualmente qual gateway está
ativo (MP ou Pagar.me) direto pelas configurações do painel, sem deploy —
para contornar uma eventual indisponibilidade do Mercado Pago.

## Goals

- Módulo `mercadopago-br` (novo, mesmo padrão de `AbstractPaymentProvider`
  usado por `pagarme-br`) com chamadas reais à API do Mercado Pago para
  pix, cartão de crédito e boleto (`bolbradesco`).
- Webhook real (`/webhooks/mercadopago`) validando a assinatura
  (`x-signature`) e buscando o pagamento pela API antes de confiar no
  status (não confiar só no payload do webhook).
- Setting singleton `active_gateway` (`mercadopago` | `pagarme`), editável
  via nova página admin, lida pelo storefront antes de criar a payment
  session — switch único e global (afeta pix+card+boleto juntos).
- Storefront: escolhe o `provider_id` correto (MP ou Pagar.me) conforme o
  `active_gateway` atual, em vez do mapeamento fixo hoje hardcoded em
  `PAYMENT_PROVIDER_IDS`.
- Cartão de crédito real: como a API do MP não aceita número de cartão cru
  do backend (exigência PCI), o storefront precisa tokenizar o cartão
  client-side com o SDK `MercadoPago.js` (`card_token`) antes de criar a
  payment session. Isso é formulário de cartão novo — hoje o checkout não
  tem nenhum campo de número/validade/CVV porque o fluxo era 100% fake.

- Webhook confirmado do MP precisa **transicionar o status real do pedido**
  no Medusa (pendente → pago), não só emitir o SSE que hoje alimenta a tela
  de sucesso. Hoje nenhum provider faz isso — `completeCart` cria o pedido
  na hora do clique, sem checar pagamento; isso muda para o MP. O SSE
  continua existindo (tela de sucesso depende dele), mas passa a ser
  disparado depois da confirmação real via API, não antes.
- Cartão recusado pelo MP durante a autorização precisa **bloquear o
  pedido**: `handlePlaceOrder` precisa de um branch de erro quando a
  autorização falha, mostrando o erro ao cliente em vez de seguir pro
  `completeCart`. Caminho novo — nenhum provider atual trata recusa.
- Troca do `active_gateway` só afeta **checkouts novos a partir da troca**.
  O storefront confere o gateway ativo imediatamente antes de criar a
  payment session (não precisa invalidar/reconciliar sessões já em
  andamento no gateway antigo).

## Non-goals

- Não migrar `pagarme-br` para integração real agora (fica stub).
- Não fazer fallback automático (detecção de outage + switch sozinho) —
  é decisão manual do admin.
- Não construir toggle por método de pagamento (ex.: pix no MP, boleto no
  Pagar.me) — é um switch único e global.

## Anti-goals

- Nunca enviar número de cartão/CVV crus para o backend — sempre token do
  SDK do MP. Logar token é tão sensível quanto logar o cartão: evitar.
- Nunca confiar no corpo do webhook do MP sem rebuscar o pagamento pela API
  (payload de webhook pode ser forjado se a assinatura não é checada).

## Constraints

- Precisa das credenciais reais do cliente: `MP_ACCESS_TOKEN` (server-side),
  `MP_PUBLIC_KEY` (client-side, para o SDK JS), `MP_WEBHOOK_SECRET`
  (validação de assinatura), e um `MP_MODE` (`sandbox`/`live`) seguindo o
  mesmo padrão de env var que `PAGARME_MODE`. O usuário fornece esses
  valores fora desta conversa (não entram no design doc nem em código).
- Segue o padrão arquitetural já existente no repo:
  - Provider novo como módulo Medusa (`AbstractPaymentProvider`), registrado
    em `medusa-config.ts` ao lado de `pagarme-br`, não substituindo.
  - Setting singleton segue o padrão já usado por `maintenance_settings`
    (módulo `access-control`): linha única id `"default"`, service com
    `get`/`update`.
- `provider_id` resultante no Medusa é `pp_mercadopago-br_pix_br` /
  `pp_mercadopago-br_card_br` / `pp_mercadopago-br_boleto_br` (mesmo esquema
  de nomes hoje usado pelo Pagar.me, só troca o identificador do módulo).

## Decisões já tomadas (nesta conversa)

- Mercado Pago é o gateway principal; Pagar.me é o secundário/backup.
- Mercado Pago entra com integração real desde já (não stub).
- Pagar.me permanece stub por ora.
- Toggle é um switch global único (não por método de pagamento).
- Setting de gateway ativo mora no módulo `access-control`, mesmo padrão de
  `maintenance_settings` (nova model `payment_gateway_settings`).

## O que fica a cargo de quem for construir

- Endpoints exatos da API do MP usados por método (`/v1/payments` com
  `payment_method_id: "pix"` / `"bolbradesco"` / cartão com `token`), e o
  mapeamento de status MP (`approved`/`rejected`/`pending`/`in_process`)
  para os status internos (`captured`/`canceled`/`pending`).
- Esquema exato de validação do `x-signature` do webhook MP (HMAC conforme
  doc oficial do Mercado Pago).
- Layout do formulário de cartão novo no checkout e pontos exatos de onde
  carregar o SDK `MercadoPago.js` e gerar o `card_token`.
- Layout da página admin do toggle (pode seguir o visual de
  `admin/routes/access-control/page.tsx`).
- Nomes finais das rotas API (`/store/payment-gateway`,
  `/admin/payment-gateway-settings` ou equivalentes) — qualquer nome que
  siga o padrão REST já usado no resto do backend serve.
- Se o Pagar.me precisa ganhar um fallback automático (não manual) algum
  dia, é decisão nova — não construir agora.
- Mecanismo exato de transição de status do pedido (qual workflow/API do
  Medusa usar para marcar pagamento como capturado depois da confirmação
  do webhook) e onde fica a UX de "cartão recusado" no checkout.
