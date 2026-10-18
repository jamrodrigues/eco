import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { STORE_COINS_MODULE } from "../../../../modules/store-coins"
import { getBalance } from "../../../../modules/store-coins/ledger"

/**
 * GET /admin/store-coins/customers?q=email-ou-nome
 *
 * Busca clientes (reusa o Customer module nativo) e anexa o saldo de
 * moedas de cada um, para a tela de Admin de moedas.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER)
  const storeCoinsService: any = req.scope.resolve(STORE_COINS_MODULE)

  const q = String(req.query.q || "").trim()
  const filters = q ? { email: { $ilike: `%${q}%` } } : {}

  const customers = await customerModuleService.listCustomers(filters, { take: 50 })

  const withBalance = await Promise.all(
    customers.map(async (c: any) => ({
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      coins_balance: await getBalance(storeCoinsService, c.id),
    }))
  )

  res.status(200).json({ customers: withBalance })
}
