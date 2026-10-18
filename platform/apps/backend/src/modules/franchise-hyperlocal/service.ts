import { MedusaService } from "@medusajs/framework/utils"
import FranchiseUnit from "./models/franchise-unit"

class FranchiseHyperlocalModuleService extends MedusaService({
  FranchiseUnit,
}) {}

export default FranchiseHyperlocalModuleService
