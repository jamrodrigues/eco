import { Module } from "@medusajs/framework/utils"
import StoreCoinsModuleService from "./service"

export const STORE_COINS_MODULE = "storeCoins"

export default Module(STORE_COINS_MODULE, {
  service: StoreCoinsModuleService,
})
