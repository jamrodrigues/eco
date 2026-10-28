import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /store/customers/me/password — troca de senha de um cliente JÁ
 * logado (`/conta` -> aba Trocar Senha).
 *
 * Por que não reaproveitar a rota nativa `/auth/customer/emailpass/update`
 * (usada em confirmPasswordReset, fluxo "esqueci minha senha"): ela exige
 * explicitamente `token.purpose === "reset"` e `token.jti`
 * (ver node_modules/@medusajs/medusa/dist/api/auth/utils/validate-token.js) --
 * um token de sessão normal (login) é rejeitado de propósito ali, pra não
 * deixar um Bearer de sessão qualquer trocar senha por esse endpoint
 * genérico. Essa rota aqui é o endpoint específico pra esse caso: a
 * identidade já foi validada pelo nosso próprio middleware
 * (authenticate('customer', ['bearer']) em middlewares.ts), então
 * chamamos authService.updateProvider diretamente -- mesma chamada que a
 * rota nativa faz por baixo dos panos, só sem a checagem de purpose
 * (que não se aplica aqui: quem está chamando já é o dono da sessão).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as unknown as { auth_context?: { actor_id?: string } }).auth_context
    ?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Sessão de cliente inválida." })
  }

  const { password } = (req.body as { password?: string }) || {}
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "A senha precisa ter pelo menos 8 caracteres." })
  }

  const customerModuleService: any = req.scope.resolve(Modules.CUSTOMER)
  const customer = await customerModuleService.retrieveCustomer(customerId)

  // Para o provider "emailpass", entity_id é o e-mail (identificador do
  // provider_identity), não o customer_id -- confirmado em
  // node_modules/@medusajs/medusa/dist/api/auth/[actor_type]/[auth_provider]/reset-password/route.js
  // (entityId: identifier, onde identifier é o e-mail do request body).
  const authModuleService: any = req.scope.resolve(Modules.AUTH)
  const result = await authModuleService.updateProvider("emailpass", {
    entity_id: customer.email,
    email: customer.email,
    password,
  })

  if (!result.success) {
    return res.status(400).json({ message: result.error || "Não foi possível trocar a senha." })
  }

  res.status(200).json({ success: true })
}
