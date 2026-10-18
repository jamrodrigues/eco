import { MedusaService } from "@medusajs/framework/utils"
import InstitutionalPage from "./models/institutional-page"

class InstitutionalPagesModuleService extends MedusaService({
  InstitutionalPage,
}) {}

export default InstitutionalPagesModuleService
