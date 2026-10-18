import { model } from "@medusajs/framework/utils"

/**
 * Mapeia um admin user_id (do modulo core User, nao tocado/migrado
 * aqui) para um role_id. Um papel por usuario por enquanto. Usuario
 * sem linha aqui cai no default super_admin (ver permissions.ts) para
 * nunca travar o primeiro admin fora do sistema quando isso sobe.
 */
const UserRole = model.define("user_role", {
  id: model.id().primaryKey(),
  user_id: model.text().unique(),
  role_id: model.text(),
})

export default UserRole
