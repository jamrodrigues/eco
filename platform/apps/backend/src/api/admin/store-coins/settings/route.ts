import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_COINS_MODULE } from "../../../../modules/store-coins"
import { getSettings, updateSettings } from "../../../../modules/store-coins/ledger"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: any = req.scope.resolve(STORE_COINS_MODULE)
  const settings = await getSettings(service)
  res.status(200).json({ settings })
}

type UpdateBody = {
  coins_per_real?: number
  cashback_percent?: number
  max_redeem_per_order?: number
  expiration_days?: number | null
}

export async function PUT(req: MedusaRequest<UpdateBody>, res: MedusaResponse) {
  const service: any = req.scope.resolve(STORE_COINS_MODULE)
  try {
    const settings = await updateSettings(service, req.body)
    res.status(200).json({ settings })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
