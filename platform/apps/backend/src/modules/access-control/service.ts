import { MedusaService } from "@medusajs/framework/utils"
import Role from "./models/role"
import UserRole from "./models/user-role"
import MaintenanceSettings from "./models/maintenance-settings"

class AccessControlModuleService extends MedusaService({
  Role,
  UserRole,
  MaintenanceSettings,
}) {}

export default AccessControlModuleService
