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
  return accessControlService.updatePaymentGatewaySettings({ id: DEFAULT_ID, ...data })
}
