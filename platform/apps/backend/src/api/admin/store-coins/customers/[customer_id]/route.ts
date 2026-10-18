import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_COINS_MODULE } from "../../../../../modules/store-coins"
import { getBalance, listLedger } from "../../../../../modules/store-coins/ledger"

/**
 * GET /admin/store-coins/customers/:customer_id — saldo + extrato.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeCoinsService: any = req.scope.resolve(STORE_COINS_MODULE)
  const { customer_id } = req.params

  const [balance, ledger] = await Promise.all([
    getBalance(storeCoinsService, customer_id),
    listLedger(storeCoinsService, customer_id, 100),
  ])

  res.status(200).json({ customer_id, coins_balance: balance, ledger })
}
