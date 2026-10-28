"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/Header"
import BottomNav from "@/components/BottomNav"
import MaterialIcon from "@/components/MaterialIcon"
import {
  getCurrentCustomer,
  getSessionToken,
  updateMyProfile,
  changeMyPassword,
  type CurrentCustomer,
} from "@/lib/auth"
import { listMyOrders, type MyOrder } from "@/lib/orders"
import {
  listMyAddresses,
  createMyAddress,
  updateMyAddress,
  deleteMyAddress,
  type CustomerAddress,
  type AddressInput,
} from "@/lib/addresses"
import { getMyCoins, type MyCoins, type CoinTransaction } from "@/lib/coins"

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  not_paid: "Aguardando pagamento",
  awaiting: "Aguardando pagamento",
  authorized: "Pagamento autorizado",
  partially_authorized: "Pagamento parcialmente autorizado",
  captured: "Pago",
  partially_captured: "Parcialmente pago",
  partially_refunded: "Parcialmente reembolsado",
  refunded: "Reembolsado",
  canceled: "Cancelado",
  requires_action: "Ação necessária",
}

const ORDER_TABS = [
  { key: "all", label: "Todos" },
  { key: "awaiting", label: "Aguardando pagamento" },
  { key: "paid", label: "Pago" },
  { key: "refunded", label: "Reembolsado" },
  { key: "canceled", label: "Cancelado" },
] as const

type OrderTabKey = (typeof ORDER_TABS)[number]["key"]

function orderMatchesTab(order: MyOrder, tab: OrderTabKey): boolean {
  if (tab === "all") return true
  if (tab === "awaiting") return order.payment_status === "not_paid" || order.payment_status === "awaiting"
  if (tab === "paid") return order.payment_status === "captured" || order.payment_status === "partially_captured"
  if (tab === "refunded") return order.payment_status === "refunded" || order.payment_status === "partially_refunded"
  if (tab === "canceled") return order.status === "canceled" || order.payment_status === "canceled"
  return true
}

const COIN_TYPE_LABEL: Record<CoinTransaction["type"], string> = {
  purchase_cashback: "Cashback de compra",
  signup_bonus: "Bônus de cadastro",
  review_bonus: "Bônus de avaliação",
  referral_bonus: "Bônus de indicação",
  redeemed: "Usado em compra",
  expired: "Expiração",
  manual_admin_adjust: "Ajuste administrativo",
}

function formatBRL(amountCents: number) {
  return (amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const EMPTY_ADDRESS_FORM: AddressInput = {
  address_name: "",
  first_name: "",
  last_name: "",
  phone: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: "br",
  is_default_shipping: false,
}

type Tab = "perfil" | "enderecos" | "senha" | "pedidos" | "moedas"

const NAV: { key: Tab; label: string; group: "conta" | "compras" | "moedas" }[] = [
  { key: "perfil", label: "Perfil", group: "conta" },
  { key: "enderecos", label: "Endereços", group: "conta" },
  { key: "senha", label: "Trocar Senha", group: "conta" },
  { key: "pedidos", label: "Minhas Compras", group: "compras" },
  { key: "moedas", label: "Moedas", group: "moedas" },
]

export default function ContaPage() {
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CurrentCustomer | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("pedidos")
  const [error, setError] = useState<string | null>(null)

  const [orders, setOrders] = useState<MyOrder[]>([])
  const [orderTab, setOrderTab] = useState<OrderTabKey>("all")

  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressForm, setAddressForm] = useState<AddressInput | null>(null)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)

  const [coins, setCoins] = useState<MyCoins | null>(null)

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    gender: "" as "" | "masculino" | "feminino" | "outros",
    birth_date: "",
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  const [passwordForm, setPasswordForm] = useState({ old_password: "", password: "", confirm: "" })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    const t = getSessionToken()
    if (!t) {
      setLoading(false)
      return
    }
    setToken(t)
    ;(async () => {
      try {
        const [me, myOrders, myAddresses, myCoins] = await Promise.all([
          getCurrentCustomer(),
          listMyOrders(t),
          listMyAddresses(t),
          getMyCoins(t),
        ])
        setCustomer(me)
        if (me) {
          const metadata = (me.metadata || {}) as Record<string, unknown>
          setProfileForm({
            first_name: me.first_name || "",
            last_name: me.last_name || "",
            phone: me.phone || "",
            gender: (metadata.gender as "masculino" | "feminino" | "outros" | undefined) || "",
            birth_date: (metadata.birth_date as string | undefined) || "",
          })
        }
        setOrders(myOrders)
        setAddresses(myAddresses)
        setCoins(myCoins)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível carregar sua conta.")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function refreshAddresses() {
    if (!token) return
    setAddresses(await listMyAddresses(token))
  }

  async function handleSaveAddress() {
    if (!token || !addressForm) return
    setAddressSaving(true)
    setAddressError(null)
    try {
      if (!addressForm.first_name.trim() || !addressForm.address_1.trim() || !addressForm.postal_code.trim()) {
        throw new Error("Preencha nome, endereço e CEP.")
      }
      if (editingAddressId) {
        await updateMyAddress(token, editingAddressId, addressForm)
      } else {
        await createMyAddress(token, addressForm)
      }
      setAddressForm(null)
      setEditingAddressId(null)
      await refreshAddresses()
    } catch (e) {
      setAddressError(e instanceof Error ? e.message : "Não foi possível salvar o endereço.")
    } finally {
      setAddressSaving(false)
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!token) return
    await deleteMyAddress(token, id)
    await refreshAddresses()
  }

  async function handleSetDefault(address: CustomerAddress) {
    if (!token) return
    await updateMyAddress(token, address.id, { is_default_shipping: true })
    await refreshAddresses()
  }

  async function handleSaveProfile() {
    if (!token || !customer) return
    setProfileSaving(true)
    setProfileMessage(null)
    try {
      const updated = await updateMyProfile(token, {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        ...(profileForm.phone ? { phone: profileForm.phone } : {}),
        metadata: {
          ...(customer.metadata || {}),
          ...(profileForm.gender ? { gender: profileForm.gender } : {}),
          ...(profileForm.birth_date ? { birth_date: profileForm.birth_date } : {}),
        },
      })
      setCustomer(updated)
      setProfileMessage("Perfil atualizado.")
    } catch (e) {
      setProfileMessage(e instanceof Error ? e.message : "Não foi possível salvar o perfil.")
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!token) return
    setPasswordError(null)
    setPasswordMessage(null)
    if (!passwordForm.old_password) {
      setPasswordError("Informe a senha atual.")
      return
    }
    if (passwordForm.password.length < 8) {
      setPasswordError("A nova senha precisa ter pelo menos 8 caracteres.")
      return
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError("As senhas não conferem.")
      return
    }
    setPasswordSaving(true)
    try {
      await changeMyPassword(token, passwordForm.old_password, passwordForm.password)
      setPasswordForm({ old_password: "", password: "", confirm: "" })
      setPasswordMessage("Senha alterada com sucesso.")
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Não foi possível trocar a senha.")
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <section className="w-full max-w-container mx-auto px-4 py-16 mb-20 md:mb-10 min-h-[50vh] flex items-center justify-center text-textSecondary">
          Carregando...
        </section>
        <BottomNav />
      </>
    )
  }

  if (!customer) {
    return (
      <>
        <Header />
        <section className="w-full max-w-container mx-auto px-4 py-16 mb-20 md:mb-10 min-h-[50vh] flex flex-col items-center justify-center text-center">
          <MaterialIcon name="person" className="text-5xl mb-4 text-textSecondary" />
          <h1 className="text-xl font-bold text-textPrimary mb-2">Você ainda não entrou</h1>
          <p className="text-textSecondary text-sm mb-4">
            Entre na sua conta para ver pedidos, moedas e endereços salvos.
          </p>
          <Link
            href="/login?next=/conta"
            className="px-6 py-2 bg-brand text-white rounded font-semibold"
          >
            Entrar
          </Link>
        </section>
        <BottomNav />
      </>
    )
  }

  const filteredOrders = orders.filter((o) => orderMatchesTab(o, orderTab))
  const displayName = customer.first_name || customer.email
  const initial = (customer.first_name || customer.email).charAt(0).toUpperCase()

  return (
    <>
      <Header />
      <section className="w-full max-w-container mx-auto px-4 py-6 mb-20 md:mb-10">
        {error && <p className="text-sm text-badgeOfficial mb-4">{error}</p>}

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:block w-60 shrink-0 sticky top-[140px]">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-black/[.09]">
              <div className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{displayName}</p>
                <p className="text-textSecondary text-xs truncate">{customer.email}</p>
              </div>
            </div>

            <p className="text-[11px] uppercase tracking-wide text-textSecondary font-semibold mb-1 px-1">
              Minha Conta
            </p>
            <nav className="mb-4">
              {NAV.filter((n) => n.group === "conta").map((n) => (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`block w-full text-left px-3 py-2 rounded text-sm ${
                    tab === n.key ? "bg-brand/10 text-brand font-semibold" : "text-textPrimary hover:bg-black/[.03]"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </nav>

            <nav className="mb-1">
              {NAV.filter((n) => n.group === "compras").map((n) => (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`block w-full text-left px-3 py-2 rounded text-sm ${
                    tab === n.key ? "bg-brand/10 text-brand font-semibold" : "text-textPrimary hover:bg-black/[.03]"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </nav>

            <nav>
              {NAV.filter((n) => n.group === "moedas").map((n) => (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`block w-full text-left px-3 py-2 rounded text-sm ${
                    tab === n.key ? "bg-brand/10 text-brand font-semibold" : "text-textPrimary hover:bg-black/[.03]"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Tabs (mobile) */}
          <div className="md:hidden w-full">
            <h1 className="text-xl font-bold text-textPrimary mb-1">Olá, {displayName}</h1>
            <p className="text-textSecondary text-sm mb-4">{customer.email}</p>
            <div className="flex gap-2 mb-5 overflow-x-auto border-b border-black/[.09]">
              {NAV.map((n) => (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${
                    tab === n.key ? "border-brand text-brand" : "border-transparent text-textSecondary"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 min-w-0 w-full bg-surface border border-black/[.09] rounded p-4 min-h-[420px]">
            {tab === "perfil" && (
              <div>
                <h2 className="font-semibold text-base mb-4">Perfil</h2>
                {profileMessage && <p className="text-xs text-textSecondary mb-3">{profileMessage}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md text-sm">
                  <input
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    placeholder="Nome"
                    className="border border-black/[.09] rounded px-2 py-1.5"
                  />
                  <input
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    placeholder="Sobrenome"
                    className="border border-black/[.09] rounded px-2 py-1.5"
                  />
                  <input
                    value={customer.email}
                    disabled
                    className="col-span-full border border-black/[.09] rounded px-2 py-1.5 bg-black/[.03] text-textSecondary"
                  />
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="Telefone"
                    className="col-span-full border border-black/[.09] rounded px-2 py-1.5"
                  />
                  <div className="col-span-full flex items-center gap-4 text-textPrimary">
                    <span className="text-textSecondary text-xs shrink-0">Sexo</span>
                    {(["masculino", "feminino", "outros"] as const).map((g) => (
                      <label key={g} className="flex items-center gap-1.5 text-xs capitalize">
                        <input
                          type="radio"
                          name="gender"
                          checked={profileForm.gender === g}
                          onChange={() => setProfileForm({ ...profileForm, gender: g })}
                        />
                        {g}
                      </label>
                    ))}
                  </div>
                  <label className="col-span-full flex items-center gap-2 text-xs text-textSecondary">
                    Data de nascimento
                    <input
                      type="date"
                      value={profileForm.birth_date}
                      onChange={(e) => setProfileForm({ ...profileForm, birth_date: e.target.value })}
                      className="border border-black/[.09] rounded px-2 py-1.5 text-textPrimary"
                    />
                  </label>
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="mt-4 px-5 py-2 bg-brand text-white rounded text-sm font-semibold disabled:opacity-50"
                >
                  {profileSaving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            )}

            {tab === "senha" && (
              <div>
                <h2 className="font-semibold text-base mb-4">Trocar Senha</h2>
                {passwordError && <p className="text-xs text-badgeOfficial mb-3">{passwordError}</p>}
                {passwordMessage && <p className="text-xs text-green-600 mb-3">{passwordMessage}</p>}
                <div className="grid grid-cols-1 gap-3 max-w-xs text-sm">
                  <input
                    type="password"
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    placeholder="Senha atual"
                    className="border border-black/[.09] rounded px-2 py-1.5"
                  />
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    placeholder="Nova senha (mín. 8 caracteres)"
                    className="border border-black/[.09] rounded px-2 py-1.5"
                  />
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    placeholder="Confirmar nova senha"
                    className="border border-black/[.09] rounded px-2 py-1.5"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={passwordSaving}
                  className="mt-4 px-5 py-2 bg-brand text-white rounded text-sm font-semibold disabled:opacity-50"
                >
                  {passwordSaving ? "Salvando..." : "Alterar senha"}
                </button>
              </div>
            )}

            {tab === "pedidos" && (
              <div>
                <h2 className="font-semibold text-base mb-3">Minhas Compras</h2>
                <div className="flex gap-2 mb-3 overflow-x-auto text-xs">
                  {ORDER_TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setOrderTab(t.key)}
                      className={`px-3 py-1.5 rounded-full border whitespace-nowrap ${
                        orderTab === t.key
                          ? "bg-brand text-white border-brand"
                          : "border-black/[.09] text-textSecondary"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {filteredOrders.length === 0 && (
                  <p className="text-textSecondary text-sm py-6 text-center">Nenhum pedido nesta categoria.</p>
                )}

                <div className="space-y-2">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-black/[.09] rounded p-3 flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-semibold">Pedido #{order.display_id}</p>
                        <p className="text-textSecondary text-xs">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatBRL(order.total)}</p>
                        <p className="text-textSecondary text-xs">
                          {PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "enderecos" && (
              <div>
                <h2 className="font-semibold text-base mb-3">Endereços</h2>
                {!addressForm && (
                  <button
                    onClick={() => {
                      setAddressForm(EMPTY_ADDRESS_FORM)
                      setEditingAddressId(null)
                      setAddressError(null)
                    }}
                    className="mb-3 px-4 py-2 bg-brand text-white rounded text-sm font-semibold"
                  >
                    + Adicionar endereço
                  </button>
                )}

                {addressForm && (
                  <div className="border border-black/[.09] rounded p-3 mb-4 space-y-2 max-w-lg">
                    <p className="font-semibold text-sm mb-1">
                      {editingAddressId ? "Editar endereço" : "Novo endereço"}
                    </p>
                    {addressError && <p className="text-xs text-badgeOfficial">{addressError}</p>}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <input
                        value={addressForm.address_name || ""}
                        onChange={(e) => setAddressForm({ ...addressForm, address_name: e.target.value })}
                        placeholder="Apelido (ex: Casa, Trabalho)"
                        className="col-span-2 border border-black/[.09] rounded px-2 py-1.5"
                      />
                      <input
                        value={addressForm.first_name}
                        onChange={(e) => setAddressForm({ ...addressForm, first_name: e.target.value })}
                        placeholder="Nome"
                        className="border border-black/[.09] rounded px-2 py-1.5"
                      />
                      <input
                        value={addressForm.last_name}
                        onChange={(e) => setAddressForm({ ...addressForm, last_name: e.target.value })}
                        placeholder="Sobrenome"
                        className="border border-black/[.09] rounded px-2 py-1.5"
                      />
                      <input
                        value={addressForm.phone || ""}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        placeholder="Telefone"
                        className="border border-black/[.09] rounded px-2 py-1.5"
                      />
                      <input
                        value={addressForm.postal_code}
                        onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                        placeholder="CEP"
                        className="border border-black/[.09] rounded px-2 py-1.5"
                      />
                      <input
                        value={addressForm.address_1}
                        onChange={(e) => setAddressForm({ ...addressForm, address_1: e.target.value })}
                        placeholder="Endereço completo"
                        className="col-span-2 border border-black/[.09] rounded px-2 py-1.5"
                      />
                      <input
                        value={addressForm.address_2 || ""}
                        onChange={(e) => setAddressForm({ ...addressForm, address_2: e.target.value })}
                        placeholder="Complemento"
                        className="col-span-2 border border-black/[.09] rounded px-2 py-1.5"
                      />
                      <input
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        placeholder="Cidade"
                        className="border border-black/[.09] rounded px-2 py-1.5"
                      />
                      <input
                        value={addressForm.province || ""}
                        onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                        placeholder="UF"
                        className="border border-black/[.09] rounded px-2 py-1.5"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-textSecondary">
                      <input
                        type="checkbox"
                        checked={!!addressForm.is_default_shipping}
                        onChange={(e) => setAddressForm({ ...addressForm, is_default_shipping: e.target.checked })}
                      />
                      Definir como endereço padrão
                    </label>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveAddress}
                        disabled={addressSaving}
                        className="px-4 py-1.5 bg-brand text-white rounded text-sm font-semibold disabled:opacity-50"
                      >
                        {addressSaving ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        onClick={() => {
                          setAddressForm(null)
                          setEditingAddressId(null)
                          setAddressError(null)
                        }}
                        className="px-4 py-1.5 border border-black/[.09] rounded text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {addresses.length === 0 && !addressForm && (
                  <p className="text-textSecondary text-sm py-6 text-center">Nenhum endereço salvo ainda.</p>
                )}

                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="border border-black/[.09] rounded p-3 text-sm max-w-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold">
                          {addr.address_name || `${addr.first_name} ${addr.last_name}`.trim()}
                          {addr.is_default_shipping && (
                            <span className="ml-2 text-[10px] uppercase bg-brand/10 text-brand px-1.5 py-0.5 rounded">
                              Padrão
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-textSecondary text-xs">
                        {addr.address_1}
                        {addr.address_2 ? `, ${addr.address_2}` : ""} — {addr.city}/{addr.province} — CEP {addr.postal_code}
                      </p>
                      {addr.phone && <p className="text-textSecondary text-xs">{addr.phone}</p>}
                      <div className="flex gap-3 mt-2 text-xs">
                        <button
                          onClick={() => {
                            setEditingAddressId(addr.id)
                            setAddressForm({
                              address_name: addr.address_name || "",
                              first_name: addr.first_name || "",
                              last_name: addr.last_name || "",
                              phone: addr.phone || "",
                              address_1: addr.address_1 || "",
                              address_2: addr.address_2 || "",
                              city: addr.city || "",
                              province: addr.province || "",
                              postal_code: addr.postal_code || "",
                              country_code: addr.country_code || "br",
                              is_default_shipping: addr.is_default_shipping,
                            })
                            setAddressError(null)
                          }}
                          className="text-brand font-semibold"
                        >
                          Editar
                        </button>
                        {!addr.is_default_shipping && (
                          <button onClick={() => handleSetDefault(addr)} className="text-textSecondary">
                            Definir como padrão
                          </button>
                        )}
                        <button onClick={() => handleDeleteAddress(addr.id)} className="text-badgeOfficial">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "moedas" && coins && (
              <div>
                <h2 className="font-semibold text-base mb-3">Moedas</h2>
                <div className="bg-canvas border border-black/[.09] rounded p-4 mb-4 flex items-center gap-3 max-w-md">
                  <MaterialIcon name="monetization_on" className="text-3xl leading-none" />
                  <div>
                    <p className="text-xl font-bold text-textPrimary">{coins.coins_balance}</p>
                    <p className="text-textSecondary text-xs">moedas disponíveis</p>
                  </div>
                </div>

                <h3 className="font-semibold text-sm mb-2">Extrato</h3>
                {coins.ledger.length === 0 && (
                  <p className="text-textSecondary text-sm py-6 text-center">Nenhuma movimentação ainda.</p>
                )}
                <div className="space-y-2">
                  {coins.ledger.map((t) => (
                    <div key={t.id} className="border border-black/[.09] rounded p-3 flex items-center justify-between text-sm max-w-lg">
                      <div>
                        <p className="font-semibold">{COIN_TYPE_LABEL[t.type] || t.type}</p>
                        <p className="text-textSecondary text-xs">{formatDate(t.created_at)}</p>
                      </div>
                      <p className={`font-semibold ${t.amount >= 0 ? "text-green-600" : "text-badgeOfficial"}`}>
                        {t.amount >= 0 ? "+" : ""}
                        {t.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </section>
      <BottomNav />
    </>
  )
}
