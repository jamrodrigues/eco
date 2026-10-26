import seedAccessControl from "../seed-access-control"
import { ROLE_DEFINITIONS } from "../../modules/access-control/permissions"

jest.mock("../../modules/access-control", () => ({
  ACCESS_CONTROL_MODULE: "access_control",
}))

function makeContainer(existingRoles: Record<string, any>) {
  const accessControl = {
    listRoles: jest.fn(async ({ slug }: { slug: string }) =>
      existingRoles[slug] ? [existingRoles[slug]] : []
    ),
    createRoles: jest.fn(async ([data]: any[]) => [{ id: `new_${data.slug}`, ...data }]),
    updateRoles: jest.fn(async (data: any) => data),
    listUserRoles: jest.fn(async () => [{ id: "ur" }]),
    createUserRoles: jest.fn(),
  }
  const container: any = {
    resolve: (key: string) => {
      if (key === "access_control") return accessControl
      if (key === "logger") return { info: jest.fn() }
      return { listUsers: jest.fn(async () => []) }
    },
  }
  return { container, accessControl }
}

describe("seed-access-control", () => {
  it("adds newly-defined permission keys (payment_gateway) to an already-seeded role", async () => {
    const superAdmin = ROLE_DEFINITIONS.find((d) => d.slug === "super_admin")!
    const { payment_gateway, ...legacyPermissions } = superAdmin.permissions
    const existing: Record<string, any> = {}
    for (const def of ROLE_DEFINITIONS) {
      const { payment_gateway: _pg, ...rest } = def.permissions
      existing[def.slug] = { id: `role_${def.slug}`, slug: def.slug, permissions: rest }
    }
    expect(payment_gateway).toBe(true)
    expect(existing.super_admin.permissions).toEqual(legacyPermissions)

    const { container, accessControl } = makeContainer(existing)
    await seedAccessControl({ container })

    expect(accessControl.createRoles).not.toHaveBeenCalled()
    expect(accessControl.updateRoles).toHaveBeenCalledTimes(ROLE_DEFINITIONS.length)
    const superUpdate = accessControl.updateRoles.mock.calls.find(
      ([d]: any[]) => d.id === "role_super_admin"
    )![0]
    expect(superUpdate.permissions.payment_gateway).toBe(true)
    const gerenteUpdate = accessControl.updateRoles.mock.calls.find(
      ([d]: any[]) => d.id === "role_gerente"
    )![0]
    expect(gerenteUpdate.permissions.payment_gateway).toBe(false)
  })

  it("never overwrites a value the existing row already has", async () => {
    const existing: Record<string, any> = {}
    for (const def of ROLE_DEFINITIONS) {
      existing[def.slug] = { id: `role_${def.slug}`, slug: def.slug, permissions: { ...def.permissions } }
    }
    // Customized value + one missing key on super_admin.
    existing.super_admin.permissions.orders = "read_only"
    delete existing.super_admin.permissions.payment_gateway

    const { container, accessControl } = makeContainer(existing)
    await seedAccessControl({ container })

    expect(accessControl.updateRoles).toHaveBeenCalledTimes(1)
    const [update] = accessControl.updateRoles.mock.calls[0]
    expect(update.id).toBe("role_super_admin")
    expect(update.permissions.orders).toBe("read_only")
    expect(update.permissions.payment_gateway).toBe(true)
  })

  it("does not touch roles that already have every key", async () => {
    const existing: Record<string, any> = {}
    for (const def of ROLE_DEFINITIONS) {
      existing[def.slug] = { id: `role_${def.slug}`, slug: def.slug, permissions: { ...def.permissions } }
    }
    const { container, accessControl } = makeContainer(existing)
    await seedAccessControl({ container })
    expect(accessControl.updateRoles).not.toHaveBeenCalled()
  })

  it("still creates roles that do not exist yet", async () => {
    const { container, accessControl } = makeContainer({})
    await seedAccessControl({ container })
    expect(accessControl.createRoles).toHaveBeenCalledTimes(ROLE_DEFINITIONS.length)
  })
})
