export type PermissionValue = true | false | "read_only"

export type PermissionCategory =
  | "orders"
  | "customers"
  | "products_inventory"
  | "promotions"
  | "store_coins"
  | "pdv"
  | "institutional_pages"
  | "settings"
  | "maintenance_mode"
  | "payment_gateway"
  | "user_management"

export type RoleSlug = "super_admin" | "gerente" | "operador_pdv" | "atendimento_marketing"

export type PermissionMap = Record<PermissionCategory, PermissionValue>

const ALL_TRUE: PermissionMap = {
  orders: true,
  customers: true,
  products_inventory: true,
  promotions: true,
  store_coins: true,
  pdv: true,
  institutional_pages: true,
  settings: true,
  maintenance_mode: true,
  payment_gateway: true,
  user_management: true,
}

/**
 * Matriz fixa dos 4 papéis (sem editor nesta versão — ver
 * ../../src/admin/routes/access-control/page.tsx para o motivo).
 * `gerente` é tudo operacional, bloqueado só do que mexe na loja em
 * si (Settings/idioma/SEO, manutenção, gestão de usuários admin).
 */
export const ROLE_DEFINITIONS: { slug: RoleSlug; name: string; permissions: PermissionMap }[] = [
  {
    slug: "super_admin",
    name: "Super Admin",
    permissions: ALL_TRUE,
  },
  {
    slug: "gerente",
    name: "Gerente",
    permissions: {
      ...ALL_TRUE,
      settings: false,
      maintenance_mode: false,
      payment_gateway: false,
      user_management: false,
    },
  },
  {
    slug: "operador_pdv",
    name: "Operador de PDV",
    permissions: {
      orders: false,
      customers: false,
      products_inventory: "read_only",
      promotions: false,
      store_coins: false,
      pdv: true,
      institutional_pages: false,
      settings: false,
      maintenance_mode: false,
      payment_gateway: false,
      user_management: false,
    },
  },
  {
    slug: "atendimento_marketing",
    name: "Atendimento + Marketing/Conteúdo",
    permissions: {
      orders: true,
      customers: true,
      products_inventory: false,
      promotions: true,
      store_coins: "read_only",
      pdv: false,
      institutional_pages: true,
      settings: false,
      maintenance_mode: false,
      payment_gateway: false,
      user_management: false,
    },
  },
]

/**
 * Classifica um path /admin/* numa categoria de permissão por prefixo.
 * Retorna null para rotas não mapeadas (passam direto — ex: /admin/auth,
 * /admin/uploads, a própria /admin/access-control/me).
 */
const PREFIX_MAP: [string, PermissionCategory][] = [
  ["/admin/orders", "orders"],
  ["/admin/draft-orders", "orders"],
  ["/admin/customers", "customers"],
  ["/admin/customer-groups", "customers"],
  ["/admin/products", "products_inventory"],
  ["/admin/inventory", "products_inventory"],
  ["/admin/price-lists", "products_inventory"],
  ["/admin/promotions", "promotions"],
  ["/admin/campaigns", "promotions"],
  ["/admin/store-coins", "store_coins"],
  ["/admin/pdv", "pdv"],
  ["/admin/institutional-pages", "institutional_pages"],
  ["/admin/store", "settings"],
  ["/admin/regions", "settings"],
  ["/admin/tax-regions", "settings"],
  ["/admin/return-reasons", "settings"],
  ["/admin/refund-reasons", "settings"],
  ["/admin/sales-channels", "settings"],
  ["/admin/product-types", "settings"],
  ["/admin/product-tags", "settings"],
  ["/admin/locations", "settings"],
  ["/admin/stock-locations", "settings"],
  ["/admin/publishable-api-keys", "settings"],
  ["/admin/secret-api-keys", "settings"],
  ["/admin/api-keys", "settings"],
  ["/admin/workflows", "settings"],
  ["/admin/search", "settings"],
  ["/admin/shipping-options", "settings"],
  ["/admin/shipping-profiles", "settings"],
  ["/admin/fulfillment", "settings"],
  ["/admin/access-control/maintenance", "maintenance_mode"],
  ["/admin/access-control/payment-gateway", "payment_gateway"],
  ["/admin/users", "user_management"],
  ["/admin/invites", "user_management"],
  ["/admin/access-control/users", "user_management"],
  ["/admin/access-control/roles", "user_management"],
]

// Rotas que nunca devem ser bloqueadas, mesmo batendo em um prefixo
// acima (login, sessão, "quem sou eu").
const ALWAYS_ALLOW = ["/admin/auth", "/admin/access-control/me"]

export function classifyAdminPath(path: string): PermissionCategory | null {
  if (ALWAYS_ALLOW.some((p) => path.startsWith(p))) return null
  const match = PREFIX_MAP.find(([prefix]) => path.startsWith(prefix))
  return match ? match[1] : null
}

export function isAllowed(
  permissions: PermissionMap,
  category: PermissionCategory,
  method: string
): boolean {
  const value = permissions[category]
  if (value === true) return true
  if (value === "read_only") return method === "GET"
  return false
}

export async function getRoleAndPermissionsForUser(
  accessControlService: any,
  userId: string
): Promise<{ role_slug: RoleSlug; role_name: string; permissions: PermissionMap }> {
  const userRoles = await accessControlService.listUserRoles({ user_id: userId })
  const userRole = userRoles[0]

  if (!userRole) {
    // Sem papel atribuido => super_admin (rede de seguranca pra nao
    // travar admins existentes no dia em que isso sobe).
    const def = ROLE_DEFINITIONS[0]
    return { role_slug: def.slug, role_name: def.name, permissions: def.permissions }
  }

  const roles = await accessControlService.listRoles({ id: userRole.role_id })
  const role = roles[0]
  if (!role) {
    const def = ROLE_DEFINITIONS[0]
    return { role_slug: def.slug, role_name: def.name, permissions: def.permissions }
  }

  return {
    role_slug: role.slug,
    role_name: role.name,
    permissions: role.permissions as PermissionMap,
  }
}
