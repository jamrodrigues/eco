import { model } from "@medusajs/framework/utils"

/**
 * Papel fixo de admin (sem editor de matriz de permissões nesta versão
 * — os 4 papéis e suas permissões são definidos em código, em
 * ../permissions.ts, e só espelhados aqui para a tela de Admin mostrar
 * "o que esse papel pode fazer" sem precisar ler código).
 */
const Role = model.define("role", {
  id: model.id().primaryKey(),
  slug: model.text().unique(),
  name: model.text(),
  permissions: model.json(),
})

export default Role
