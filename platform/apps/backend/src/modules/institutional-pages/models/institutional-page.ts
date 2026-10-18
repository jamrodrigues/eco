import { model } from "@medusajs/framework/utils"

/**
 * Pagina institucional editavel pelo Admin (Central de Ajuda, Como
 * Comprar, Politicas, etc.) — antes era um mapa estatico no storefront,
 * agora vive no banco para poder ser editada sem deploy de codigo.
 */
const InstitutionalPage = model.define("institutional_page", {
  id: model.id().primaryKey(),
  slug: model.text().unique(),
  title: model.text(),
  body: model.json(), // string[] de paragrafos
})

export default InstitutionalPage
