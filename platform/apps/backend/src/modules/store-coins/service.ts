import { MedusaService } from "@medusajs/framework/utils"
import CoinTransaction from "./models/coin-transaction"
import CoinSettings from "./models/coin-settings"

class StoreCoinsModuleService extends MedusaService({
  CoinTransaction,
  CoinSettings,
}) {}

export default StoreCoinsModuleService
