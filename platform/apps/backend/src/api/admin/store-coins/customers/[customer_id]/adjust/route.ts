import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_COINS_MODULE } from "../../../../../../modules/store-coins"
import { manualAdjust, getBalance } from "../../../../../../modules/store-coins/ledger"

type AdjustBody = { amount: number; note: string }

/**
 * POST /admin/store-coins/customers/:customer_id/adjust
 *
 * Ajuste manual: amount positivo credita, negativo debita. Nota é
 * obrigatória (fica no extrato, auditável).
 */
export async function POST(req: MedusaRequest<AdjustBody>, res: MedusaResponse) {
  const storeCoinsService: any = req.scope.resolve(STORE_COINS_MODULE)
  const { customer_id } = req.params
  const { amount, note } = req.body

  if (!amount || !Number.isFinite(amount)) {
    return res.status(400).json({ message: "amount é obrigatório e deve ser um número diferente de zero." })
  }
  if (!note || !note.trim()) {
    return res.status(400).json({ message: "note é obrigatória para ajustes manuais (auditoria)." })
  }

  await manualAdjust(storeCoinsService, { customerId: customer_id, amount, note })
  const coins_balance = await getBalance(storeCoinsService, customer_id)

  res.status(200).json({ customer_id, coins_balance })
}
