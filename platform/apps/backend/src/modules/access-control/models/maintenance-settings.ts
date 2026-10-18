import { model } from "@medusajs/framework/utils"

/**
 * Linha unica (id fixo "default") controlando o modo manutencao do
 * storefront. Nao afeta o Admin dashboard (apps separados).
 */
const MaintenanceSettings = model.define("maintenance_settings", {
  id: model.id().primaryKey(),
  is_enabled: model.boolean().default(false),
  message: model.text().nullable(),
})

export default MaintenanceSettings
