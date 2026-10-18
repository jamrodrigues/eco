import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import EmailNotificationsService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [EmailNotificationsService],
})
