import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_COINS_MODULE } from "../../../../../modules/store-coins"
import { getBalance, listLedger } from "../../../../../modules/store-coins/ledger"

/**
 * GET /store/customers/me/coins — saldo + extrato do cliente autenticado.
 * Rota protegida via middlewares.ts (authenticate('customer', ['bearer'])),
 * mesmo padrão do GET /store/carts/:id/coins (que existe só pro funil de
 * checkout sem login ainda ativo) -- esta aqui é a versão "com sessão real"
 * pra página /conta, usando req.auth_context.actor_id (nunca um customer_id
 * vindo do client).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeCoinsService: any = req.scope.resolve(STORE_COINS_MODULE)
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
    ?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Sessão de cliente inválida." })
  }

  const [balance, ledger] = await Promise.all([
    getBalance(storeCoinsService, customerId),
    listLedger(storeCoinsService, customerId, 100),
  ])

  res.status(200).json({ coins_balance: balance, ledger })
}
