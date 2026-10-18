# PROGRESS.md — Controle de Fases (`@TechLead`)

> Repositório: `https://github.com/jamrodrigues/eco.git` — branch `main` (core white-label)
> Monorepo em `platform/` (ver `platform/apps/backend` e `platform/apps/storefront`)

## Tabela de Controle

| Fase | Branch Git | Módulo | Status | Commits |
| :--- | :--- | :--- | :--- | :--- |
| **Fase 1** | `main` | Setup Git + Docker + Medusa v2 + Região BRL + Pagamentos BR + CEP | ✅ Concluída | `6bcf7c5`, `728a24f`, `2de6c95` |
| **Fase 2** | `main` | Storefront White-Label (`brand.config.ts`) + Header 119px + Home Desktop/Mobile + Login | ✅ Concluída | `1c573d3`, `91ee2e0`, `f9e05ba`, `83c04a0` |
| **Fase 3** | `main` | Funil Completo (PDP Zoom, SKU Matrix, Carrinho, Checkout, Pix) | ✅ Concluída | `7bb17bf` |
| **Fase 4** | `main` | PDV Físico (`/app/pdv`) + Franquias Hiperlocais + Testes E2E Playwright | ✅ Concluída | `7748351` |
| **Fase 5** | `brand/vruumoto` | Identidade Vruumoto + Filtro Compatibilidade de Motos + Catálogo Motopeças | ⏳ Pendente | — |

## Trabalho adicional (fora do escopo original dos 5 passos)

Itens que apareceram em auditoria pós-Fase 4, antes de abrir a Fase 5:

- ✅ Footer institucional desktop (`f9e05ba`) — faltava na Fase 2
- ✅ Páginas reais para todos os links do Header/Footer, fim dos `href="#"` (`83c04a0`)
- ✅ CMS de páginas institucionais editável pelo Admin, sem precisar de deploy (`9031b3e`)
- ✅ Moedas (Store Coins) como módulo real com ledger + cashback automático + admin configurável (`f2cbb1a`)
- ✅ Cupom de loja migrado do hack client-trusted pro módulo nativo de Promotions do Medusa (`f2cbb1a`)
- ✅ Retirada na loja física + seletor de modalidade de envio no checkout, nunca tinha sido plugado (`63c600f`)
- ✅ RBAC real no Admin (4 papéis: Super Admin, Gerente, Operador de PDV, Atendimento+Marketing) + modo manutenção do storefront (`fafd51e`)
- ✅ Cadastro real de cliente (antes só existia login, zero fluxo de registro), checkout travado a quem tem conta, consentimento LGPD granular (privacidade obrigatória + marketing opcional separados), banner de cookies com opt-in real, e política de privacidade/cookies reescrita no formato LGPD
- ✅ E-mails transacionais reais (confirmação de pedido, boas-vindas só pra cadastro real, reset de senha) + telas `/esqueci-senha` e `/redefinir-senha` — provider sandbox-first (mesmo padrão do pagarme-br): sem `RESEND_API_KEY` só loga, com a chave manda via Resend de verdade
- ✅ Bug achado em auditoria visual mobile: Ofertas Relâmpago nunca mostrava a foto real do produto (sempre shimmer); placeholder "sem foto" estático substitui o shimmer (que simulava carregamento infinito); removidos os 52 produtos de teste criados só pra validar rolagem infinita

## Notas de arquitetura / decisões vivas

- **Naming:** proibido usar "Shopee" literal em código/módulos/containers — é engine white-label, Shopee é só referência visual. Ver `projeto/CLAUDE.md` seção 3 (`brand.config.ts`).
- **Idioma do Admin:** Medusa Admin v2.21 não tem config de idioma padrão a nível de projeto — é por usuário, em Configurações → Perfil → Idioma (`Português (Brasil)` já vem traduzido, só não vem selecionado por padrão).
- **Ambiente local:** `docker compose up -d` em `platform/`, depois `npm run dev` em `apps/backend` (porta 9000) e `apps/storefront` (porta 3000). **Nunca rodar `npm run build` do storefront com o `dev` do storefront ativo ao mesmo tempo** — os dois compartilham `.next/` e isso corrompe o cache (já aconteceu 2x nesta sessão).
- **Dev server watcher:** sempre redirecionar o log do `npm run dev` pra fora da pasta observada (ex: temp dir), senão o próprio log entra em loop de restart.

## Próximo passo

Fase 5: criar branch `brand/vruumoto`, sobrescrever `brand.config.ts` pra identidade Vruumoto (peças/acessórios de moto), ativar `enableVehicleFitmentFilter` e `enableOemPartNumberSearch`, filtro "Serve na Minha Moto?" (Marca/Modelo/Ano) e catálogo de motopeças.
