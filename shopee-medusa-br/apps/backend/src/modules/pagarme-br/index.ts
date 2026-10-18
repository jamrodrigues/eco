import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PagarmeBrService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [PagarmeBrService],
})
