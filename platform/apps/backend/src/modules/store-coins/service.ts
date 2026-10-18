/**
 * Store Coins (carteira/cashback do cliente) — 100 moedas = R$ 1,00.
 * Implementado como metadata do Customer para manter a Fase 1 simples;
 * se o volume justificar, migrar para um módulo Medusa dedicado com
 * tabela própria é o próximo passo natural.
 */
const COINS_PER_REAL = 100

export function coinsToCents(coins: number): number {
  return Math.round((coins / COINS_PER_REAL) * 100)
}

export function getCoinsBalance(customer: { metadata?: Record<string, any> }): number {
  return Number(customer.metadata?.store_coins_balance ?? 0)
}

export async function debitCoins(
  customerModuleService: any,
  customerId: string,
  coinsToDebit: number
): Promise<number> {
  const customer = await customerModuleService.retrieveCustomer(customerId)
  const currentBalance = getCoinsBalance(customer)

  if (coinsToDebit > currentBalance) {
    throw new Error(
      `Saldo de moedas insuficiente: saldo ${currentBalance}, solicitado ${coinsToDebit}`
    )
  }

  const newBalance = currentBalance - coinsToDebit
  await customerModuleService.updateCustomers(customerId, {
    metadata: { ...customer.metadata, store_coins_balance: newBalance },
  })

  return newBalance
}

export async function creditCoins(
  customerModuleService: any,
  customerId: string,
  coinsToCredit: number
): Promise<number> {
  const customer = await customerModuleService.retrieveCustomer(customerId)
  const newBalance = getCoinsBalance(customer) + coinsToCredit
  await customerModuleService.updateCustomers(customerId, {
    metadata: { ...customer.metadata, store_coins_balance: newBalance },
  })
  return newBalance
}
