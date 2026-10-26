import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import MercadoPagoBrService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [MercadoPagoBrService],
})
