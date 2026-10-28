const DEFAULT_ID = "default"

export async function getPaymentGatewaySettings(accessControlService: any): Promise<{ id: string; active_gateway: "mercadopago" | "pagarme" }> {
  try {
    return await accessControlService.retrievePaymentGatewaySettings(DEFAULT_ID)
  } catch {
    return accessControlService.createPaymentGatewaySettings({
      id: DEFAULT_ID,
      active_gateway: "mercadopago",
    })
  }
}

export async function updatePaymentGatewaySettings(
  accessControlService: any,
  data: { active_gateway?: "mercadopago" | "pagarme" }
): Promise<{ id: string; active_gateway: string }> {
  await getPaymentGatewaySettings(accessControlService) // garante que a linha existe
  // Só `active_gateway` é repassado (e o `id` é fixo): nenhum campo vindo do
  // corpo da requisição (`id`, `deleted_at`, ...) pode redirecionar o update
  // pra outra linha ou soft-deletar a linha singleton.
  const update: { id: string; active_gateway?: "mercadopago" | "pagarme" } = { id: DEFAULT_ID }
  if (data.active_gateway !== undefined) {
    update.active_gateway = data.active_gateway
  }
  return accessControlService.updatePaymentGatewaySettings(update)
}
