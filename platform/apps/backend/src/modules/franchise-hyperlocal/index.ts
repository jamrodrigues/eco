import { Module } from "@medusajs/framework/utils"
import FranchiseHyperlocalModuleService from "./service"

export const FRANCHISE_HYPERLOCAL_MODULE = "franchiseHyperlocal"

export default Module(FRANCHISE_HYPERLOCAL_MODULE, {
  service: FranchiseHyperlocalModuleService,
})
