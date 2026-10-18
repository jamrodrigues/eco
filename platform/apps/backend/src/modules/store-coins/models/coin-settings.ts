import { model } from "@medusajs/framework/utils"

/**
 * Configuracao global do programa de moedas (linha unica, id fixo
 * "default" — ver DEFAULT_SETTINGS_ID em ../settings.ts). Editavel pelo
 * Admin em /app/store-coins sem precisar de deploy/restart.
 */
const CoinSettings = model.define("coin_settings", {
  id: model.id().primaryKey(),
  coins_per_real: model.number().default(100),
  cashback_percent: model.number().default(0),
  max_redeem_per_order: model.number().default(450),
  expiration_days: model.number().nullable(),
})

export default CoinSettings
