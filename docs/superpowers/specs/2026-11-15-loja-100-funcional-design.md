# Loja 100% funcional — remoção de UI mock e integrações reais (Vruumoto)

Data: 2026-11-15. Branch: `brand/vruumoto`. Apps: `platform/apps/storefront` (Next 15.5,
React 19) e `platform/apps/backend` (Medusa 2.21.2).

## Contexto

Uma varredura do storefront achou elementos copiados de referência de e-commerce
(estilo Shopee) que são só estéticos — sem dado real ou backend por trás. A tela de
login já foi limpa (aba QR Code e login social removidos). Este documento define o
que vira real, o que é removido e o que fica atrás de flag.

## Decisões do dono da loja

| Item | Decisão |
|------|---------|
| Busca | Tem que funcionar (texto + categoria) |
| Estoque | Real na ficha técnica e nos cards |
| Ficha técnica | Real, só mostra linha que tem dado |
| "X vendidos" | Real, contado a partir de pedidos; esconder abaixo de 5 |
| Avaliações | Reais, **moderadas** (só aparecem depois de aprovadas no admin); qualquer cliente logado avalia, selo "compra verificada" pra quem comprou |
| Badge "OFICIAL" | **Retirar**; vira flag `brandConfig.features.showOfficialBadge` (false) |
| SellerCard (vendedor) | **Remover** |
| Ofertas Relâmpago | Funcionar minimamente já: admin coloca produto em oferta por X tempo usando **Price List nativa** (tipo Sale, com início/fim); storefront lê uma rota pública e esconde a seção quando não há oferta ativa |
| Carrossel | Controlado pelo admin (CRUD de banners por URL de imagem) |
| App | Não existe app; substituir "QR Code do App" por botão **Instalar app (PWA)** + QR real do site |
| Menu mobile | Trocar Vídeo/Live por Busca/Carrinho; apagar páginas placeholder |

## Restrições globais

- Nunca inventar número: nota, contagem de avaliações e "vendidos" ficam **ocultos**
  quando não há dado (ou abaixo do mínimo), nunca com valor fixo.
- Todo texto de interface em pt-BR.
- Git nesse disco (NTFS montado como root) exige `git -c safe.directory='*' <cmd>`.
- Commits no padrão existente: `feat(storefront): ...`, `feat(backend): ...`,
  `fix(...)`, `chore(...)`, mensagem em pt-BR sem acento obrigatório.
- Push em `brand/vruumoto` faz deploy automático no Coolify (ambiente demo
  `vruumoto.com.br` / `api.vruumoto.com.br`, confirmado como DEMO/DEV, não produção).
  Migrations rodam sozinhas no start do backend (`npx medusa db:migrate` no script
  `start`).
- Novas rotas `/admin/*` precisam de categoria de permissão no módulo
  `access-control` (`permissions.ts`), senão o `accessControlGuard` deixa passar sem
  controle de papel.
- Upload de imagem **não** entra nesta fase: o backend não tem file provider S3
  configurado e o provider local perde arquivos a cada redeploy. Banner usa URL.

## Fora de escopo (Fase 2)

Filtro da grade por moto, widget admin de ficha técnica, upload de imagem de banner
(S3/R2), página de vendedor/loja, notificações, chat.
