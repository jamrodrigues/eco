import { model } from "@medusajs/framework/utils"

/**
 * Lancamento no razao de moedas do cliente (cashback/wallet). O saldo
 * nunca e uma coluna cacheada — e sempre a soma dos lancamentos nao
 * expirados deste customer_id. amount positivo = credito (ganho),
 * negativo = debito (resgate, expiracao, ajuste manual negativo).
 *
 * Substitui o hack da Fase 1 que guardava um numero solto em
 * customer.metadata.store_coins_balance (sem historico, sem auditoria,
 * sem forma de o cliente realmente *ganhar* moedas).
 */
const CoinTransaction = model.define("coin_transaction", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  amount: model.number(),
  type: model.enum([
    "purchase_cashback",
    "signup_bonus",
    "review_bonus",
    "referral_bonus",
    "redeemed",
    "expired",
    "manual_admin_adjust",
  ]),
  reference_id: model.text().nullable(),
  expires_at: model.dateTime().nullable(),
  note: model.text().nullable(),
})

export default CoinTransaction
