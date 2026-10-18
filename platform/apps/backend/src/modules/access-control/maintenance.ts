const DEFAULT_ID = "default"

export async function getMaintenanceSettings(accessControlService: any) {
  try {
    return await accessControlService.retrieveMaintenanceSettings(DEFAULT_ID)
  } catch {
    return accessControlService.createMaintenanceSettings({
      id: DEFAULT_ID,
      is_enabled: false,
      message: null,
    })
  }
}

export async function updateMaintenanceSettings(
  accessControlService: any,
  data: { is_enabled?: boolean; message?: string | null }
) {
  await getMaintenanceSettings(accessControlService) // garante que a linha existe
  return accessControlService.updateMaintenanceSettings({ id: DEFAULT_ID, ...data })
}
