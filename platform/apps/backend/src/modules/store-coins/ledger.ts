/**
 * Logica de negocio do razao de moedas, fora do service (mesmo padrao
 * de src/modules/franchise-hyperlocal/match-cep.ts: service so faz CRUD,
 * regra de negocio fica em helpers chamados pelas rotas/subscribers/jobs).
 *
 * Saldo = soma de amount de todos os lancamentos nao expirados deste
 * customer_id, calculado ao vivo (expires_at IS NULL OR expires_at >
 * agora). Isso mantem o saldo sempre correto mesmo que o job de
 * expiracao (expire-coins.ts) ainda nao tenha rodado para um lote que
 * acabou de vencer — o job so existe para deixar um registro de
 * auditoria ("esse lote expirou"), nao para "zerar" nada: zerar via
 * FIFO contra resgates parciais ja feitos de um pool misto de lotes e
 * um problema bem mais complexo (coin-lot accounting) que decidimos
 * nao resolver agora.
 */

export const DEFAULT_SETTINGS_ID = "default"

export type CoinSettingsShape = {
  id: string
  coins_per_real: number
  cashback_percent: number
  max_redeem_per_order: number
  expiration_days: number | null
}

export async function getSettings(service: any): Promise<CoinSettingsShape> {
  try {
    return await service.retrieveCoinSettings(DEFAULT_SETTINGS_ID)
  } catch {
    return service.createCoinSettings({
      id: DEFAULT_SETTINGS_ID,
      coins_per_real: 100,
      cashback_percent: 2,
      max_redeem_per_order: 450,
      expiration_days: null,
    })
  }
}

export async function updateSettings(
  service: any,
  patch: Partial<Omit<CoinSettingsShape, "id">>
): Promise<CoinSettingsShape> {
  await getSettings(service) // garante que a linha default existe
  return service.updateCoinSettings({ id: DEFAULT_SETTINGS_ID, ...patch })
}

function activeTransactionFilter() {
  const now = new Date()
  return {
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
  }
}

export async function getBalance(service: any, customerId: string): Promise<number> {
  const transactions = await service.listCoinTransactions({
    customer_id: customerId,
    ...activeTransactionFilter(),
  })
  return transactions.reduce((sum: number, t: any) => sum + t.amount, 0)
}

export async function listLedger(service: any, customerId: string, limit = 50) {
  return service.listCoinTransactions(
    { customer_id: customerId },
    { order: { created_at: "DESC" }, take: limit }
  )
}

export function coinsToCents(coins: number, settings: CoinSettingsShape): number {
  return Math.round((coins / settings.coins_per_real) * 100)
}

export function centsToCoins(cents: number, settings: CoinSettingsShape): number {
  return Math.round((cents / 100) * settings.coins_per_real)
}

function expiresAtFor(settings: CoinSettingsShape): string | null {
  if (!settings.expiration_days) return null
  const d = new Date()
  d.setDate(d.getDate() + settings.expiration_days)
  return d.toISOString()
}

export async function creditCoins(
  service: any,
  params: {
    customerId: string
    coins: number
    type:
      | "purchase_cashback"
      | "signup_bonus"
      | "review_bonus"
      | "referral_bonus"
      | "manual_admin_adjust"
    referenceId?: string | null
    note?: string | null
    settings?: CoinSettingsShape
  }
) {
  if (params.coins <= 0) return null
  const settings = params.settings ?? (await getSettings(service))
  return service.createCoinTransactions({
    customer_id: params.customerId,
    amount: Math.round(params.coins),
    type: params.type,
    reference_id: params.referenceId ?? null,
    note: params.note ?? null,
    expires_at: params.type === "manual_admin_adjust" ? null : expiresAtFor(settings),
  })
}

export async function manualAdjust(
  service: any,
  params: { customerId: string; amount: number; note: string }
) {
  // amount pode ser negativo (desconta) ou positivo (credita) — ajuste
  // manual nunca expira, é um lançamento administrativo direto.
  return service.createCoinTransactions({
    customer_id: params.customerId,
    amount: Math.round(params.amount),
    type: "manual_admin_adjust",
    reference_id: null,
    note: params.note,
    expires_at: null,
  })
}

/**
 * Resgata `coins` do saldo real do cliente (nunca confia em saldo
 * informado pelo cliente/frontend), respeitando o teto configurado no
 * admin. Lança uma transação negativa do tipo "redeemed".
 */
export async function redeemCoins(
  service: any,
  params: { customerId: string; coins: number; referenceId?: string | null }
) {
  if (params.coins <= 0) return { redeemed: 0 }

  const settings = await getSettings(service)
  const balance = await getBalance(service, params.customerId)
  const capped = Math.min(params.coins, settings.max_redeem_per_order, Math.max(balance, 0))

  if (capped <= 0) return { redeemed: 0 }

  await service.createCoinTransactions({
    customer_id: params.customerId,
    amount: -capped,
    type: "redeemed",
    reference_id: params.referenceId ?? null,
    note: null,
    expires_at: null,
  })

  return { redeemed: capped }
}

/**
 * Reverte um resgate anterior (ex: cliente desmarca "usar moedas" no
 * checkout depois de já ter resgatado nesta mesma sessão de carrinho).
 * Lança o inverso como "manual_admin_adjust" de sistema — não é bem um
 * "re-ganho", é desfazer um resgate que não virou pedido.
 */
export async function undoRedeem(
  service: any,
  params: { customerId: string; coins: number; referenceId?: string | null }
) {
  if (params.coins <= 0) return null
  return service.createCoinTransactions({
    customer_id: params.customerId,
    amount: params.coins,
    type: "manual_admin_adjust",
    reference_id: params.referenceId ?? null,
    note: "Estorno automático de resgate não concluído",
    expires_at: null,
  })
}
