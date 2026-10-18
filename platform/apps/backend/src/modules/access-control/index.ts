import { Module } from "@medusajs/framework/utils"
import AccessControlModuleService from "./service"

export const ACCESS_CONTROL_MODULE = "accessControl"

export default Module(ACCESS_CONTROL_MODULE, {
  service: AccessControlModuleService,
})
