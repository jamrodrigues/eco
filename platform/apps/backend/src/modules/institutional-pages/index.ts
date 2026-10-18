import { Module } from "@medusajs/framework/utils"
import InstitutionalPagesModuleService from "./service"

export const INSTITUTIONAL_PAGES_MODULE = "institutionalPages"

export default Module(INSTITUTIONAL_PAGES_MODULE, {
  service: InstitutionalPagesModuleService,
})
