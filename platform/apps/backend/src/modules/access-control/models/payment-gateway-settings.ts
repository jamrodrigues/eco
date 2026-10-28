import { model } from "@medusajs/framework/utils"

/**
 * Linha unica (id fixo "default") com o gateway de pagamento ativo do
 * checkout: "mercadopago" (padrao) ou "pagarme" (backup manual).
 */
const PaymentGatewaySettings = model.define("payment_gateway_settings", {
  id: model.id().primaryKey(),
  active_gateway: model.text().default("mercadopago"),
})

export default PaymentGatewaySettings
