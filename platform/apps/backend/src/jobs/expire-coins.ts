import type { MedusaContainer } from "@medusajs/framework"
import { STORE_COINS_MODULE } from "../modules/store-coins"

/**
 * Expiração de moedas: roda 1x por dia, procura lançamentos de ganho
 * (purchase_cashback/signup_bonus/review_bonus/referral_bonus) cujo
 * expires_at já passou e que ainda não têm um registro "expired"
 * correspondente, e grava esse registro de auditoria.
 *
 * O saldo (getBalance em ledger.ts) já ignora lançamentos vencidos em
 * tempo real via filtro expires_at — este job NÃO precisa rodar para o
 * saldo ficar correto, ele só existe para deixar rastro auditável de
 * "esse lote expirou" no histórico que o Admin vê.
 */
export default async function expireCoinsJob(container: MedusaContainer) {
  const storeCoinsService: any = container.resolve(STORE_COINS_MODULE)

  const now = new Date()
  const justExpired = await storeCoinsService.listCoinTransactions({
    expires_at: { $lte: now },
    type: { $ne: "expired" },
  })

  for (const tx of justExpired) {
    const alreadyFlagged = await storeCoinsService.listCoinTransactions({
      type: "expired",
      reference_id: tx.id,
    })
    if (alreadyFlagged.length > 0) continue

    await storeCoinsService.createCoinTransactions({
      customer_id: tx.customer_id,
      amount: 0,
      type: "expired",
      reference_id: tx.id,
      note: `Lote de ${tx.amount} moedas (${tx.type}, lançado ${tx.created_at}) expirou.`,
      expires_at: null,
    })
  }
}

export const config = {
  name: "expire-coins",
  schedule: "0 3 * * *", // todo dia às 3h
}
