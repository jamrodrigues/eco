import { MedusaService } from "@medusajs/framework/utils"
import Role from "./models/role"
import UserRole from "./models/user-role"
import MaintenanceSettings from "./models/maintenance-settings"
import PaymentGatewaySettings from "./models/payment-gateway-settings"

class AccessControlModuleService extends MedusaService({
  Role,
  UserRole,
  MaintenanceSettings,
  PaymentGatewaySettings,
}) {}

export default AccessControlModuleService
