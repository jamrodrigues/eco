"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/Header"
import BottomNav from "@/components/BottomNav"
import { getCurrentCustomer, getSessionToken, type CurrentCustomer } from "@/lib/auth"
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

type Tab = "pedidos" | "enderecos" | "moedas"

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

  if (loading) {
    return (
      <>
        <Header />
        <section className="max-w-container mx-auto px-4 py-16 mb-20 md:mb-10 min-h-[50vh] flex items-center justify-center text-textSecondary">
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
        <section className="max-w-container mx-auto px-4 py-16 mb-20 md:mb-10 min-h-[50vh] flex flex-col items-center justify-center text-center">
          <span className="text-5xl mb-4">👤</span>
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

  return (
    <>
      <Header />
      <section className="max-w-container mx-auto px-4 py-6 mb-20 md:mb-10">
        <h1 className="text-xl font-bold text-textPrimary mb-1">Olá, {customer.first_name || customer.email}</h1>
        <p className="text-textSecondary text-sm mb-6">{customer.email}</p>

        {error && <p className="text-sm text-badgeOfficial mb-4">{error}</p>}

        <div className="flex gap-2 mb-5 border-b border-black/[.09]">
          {([
            { key: "pedidos", label: "Pedidos" },
            { key: "enderecos", label: "Endereços" },
            { key: "moedas", label: "Moedas" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${
                tab === t.key ? "border-brand text-brand" : "border-transparent text-textSecondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "pedidos" && (
          <div>
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
              <p className="text-textSecondary text-sm">Nenhum pedido nesta categoria.</p>
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
              <div className="border border-black/[.09] rounded p-3 mb-4 space-y-2">
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
              <p className="text-textSecondary text-sm">Nenhum endereço salvo ainda.</p>
            )}

            <div className="space-y-2">
              {addresses.map((addr) => (
                <div key={addr.id} className="border border-black/[.09] rounded p-3 text-sm">
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
            <div className="bg-surface border border-black/[.09] rounded p-4 mb-4 flex items-center gap-3">
              <span className="text-3xl">🪙</span>
              <div>
                <p className="text-xl font-bold text-textPrimary">{coins.coins_balance}</p>
                <p className="text-textSecondary text-xs">moedas disponíveis</p>
              </div>
            </div>

            <h2 className="font-semibold text-sm mb-2">Extrato</h2>
            {coins.ledger.length === 0 && (
              <p className="text-textSecondary text-sm">Nenhuma movimentação ainda.</p>
            )}
            <div className="space-y-2">
              {coins.ledger.map((t) => (
                <div key={t.id} className="border border-black/[.09] rounded p-3 flex items-center justify-between text-sm">
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
      </section>
      <BottomNav />
    </>
  )
}
