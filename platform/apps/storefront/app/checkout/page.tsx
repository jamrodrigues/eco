"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import { formatBRL } from "@/lib/medusa"
import {
  type Cart,
  type BrPricing,
  getCartIfExists,
  ensureGuestCustomer,
  updateCartDetails,
  addShippingMethod,
  applyBrDiscounts,
  createPaymentCollection,
  createPaymentSession,
  completeCart,
  PAYMENT_PROVIDER_IDS,
  trueAvailableCoins,
  alreadyRedeemedCoins,
  clearStoredCartId,
} from "@/lib/cart"

const STANDARD_SHIPPING_OPTION_ID = process.env.NEXT_PUBLIC_STANDARD_SHIPPING_OPTION_ID || ""
const STORE_COUPON_CENTS = 500
const MIN_SPEND_FOR_COUPON = 5000

type PaymentMethod = "pix" | "card" | "boleto" | "wallet"

const paymentOptions: { id: PaymentMethod; label: string; enabled: boolean }[] = [
  { id: "pix", label: "⚡ PIX (10% OFF EXTRA)", enabled: true },
  { id: "card", label: "💳 Cartão de Crédito (Até 3x sem juros)", enabled: true },
  { id: "boleto", label: "📄 Boleto Bancário", enabled: true },
  { id: "wallet", label: "👛 Carteira Digital", enabled: false },
]

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null | undefined>(undefined)
  const [pricing, setPricing] = useState<BrPricing | null>(null)
  const [coinsBalance, setCoinsBalance] = useState<number | null>(null)
  const [useCoupon, setUseCoupon] = useState(true)
  const [useFreeShipping, setUseFreeShipping] = useState(true)
  const [useCoins, setUseCoins] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>("pix")
  const [placing, setPlacing] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [address, setAddress] = useState({
    first_name: "Cliente",
    last_name: "Convidado",
    phone: "11999999999",
    address_1: "Av. Paulista, 1000",
    city: "São Paulo",
    province: "SP",
    postal_code: "01310-100",
    country_code: "br",
  })
  const [email, setEmail] = useState("convidado@dev.local")

  async function recalc(
    c: Cart,
    coinsOn: boolean,
    couponOn: boolean,
    freeShipOn: boolean,
    pixOn: boolean,
    balanceOverride?: number | null
  ) {
    const eligibleCoupon = couponOn && c.item_total >= MIN_SPEND_FOR_COUPON
    const balance = balanceOverride ?? coinsBalance
    const br = await applyBrDiscounts(c.id, {
      store_coupon_cents: eligibleCoupon ? STORE_COUPON_CENTS : 0,
      free_shipping: freeShipOn,
      coins_to_redeem: coinsOn ? Math.min(450, trueAvailableCoins(c, balance)) : 0,
      is_pix_selected: pixOn,
    })
    setPricing(br)
  }

  useEffect(() => {
    ;(async () => {
      const c = await getCartIfExists()
      if (!c || c.items.length === 0) {
        router.push("/cart")
        return
      }
      if (c.shipping_methods.length === 0 && STANDARD_SHIPPING_OPTION_ID) {
        await addShippingMethod(c.id, STANDARD_SHIPPING_OPTION_ID)
      }
      const { coins_balance } = await ensureGuestCustomer(c.id)
      setCoinsBalance(coins_balance)
      const fresh = await getCartIfExists()
      setCart(fresh)
      const alreadyUsingCoins = alreadyRedeemedCoins(fresh) > 0
      setUseCoins(alreadyUsingCoins)
      if (fresh) await recalc(fresh, alreadyUsingCoins, true, true, true, coins_balance)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleToggle(
    next: Partial<{ coupon: boolean; freeShipping: boolean; coins: boolean; method: PaymentMethod }>
  ) {
    if (!cart || toggling) return
    setToggling(true)
    try {
      const couponOn = next.coupon ?? useCoupon
      const freeShipOn = next.freeShipping ?? useFreeShipping
      const coinsOn = next.coins ?? useCoins
      const nextMethod = next.method ?? method
      setUseCoupon(couponOn)
      setUseFreeShipping(freeShipOn)
      setUseCoins(coinsOn)
      setMethod(nextMethod)
      const fresh = await getCartIfExists()
      if (!fresh) return
      setCart(fresh)
      await recalc(fresh, coinsOn, couponOn, freeShipOn, nextMethod === "pix")
    } finally {
      setToggling(false)
    }
  }

  async function handlePlaceOrder() {
    if (!cart) return
    setPlacing(true)
    setError(null)
    try {
      await updateCartDetails(cart.id, {
        email,
        shipping_address: address,
      })
      await recalc(cart, useCoins, useCoupon, useFreeShipping, method === "pix")

      const paymentCollection = await createPaymentCollection(cart.id)
      const session = await createPaymentSession(
        paymentCollection.id,
        PAYMENT_PROVIDER_IDS[method as keyof typeof PAYMENT_PROVIDER_IDS]
      )

      if (method === "pix" && session) {
        try {
          window.localStorage.setItem(
            `pix_session_${cart.id}`,
            JSON.stringify(session.data)
          )
        } catch {
          // localStorage indisponível — a tela de sucesso cai no fallback sem QR
        }
      }

      const result = await completeCart(cart.id)
      if (result.type === "order" && result.order) {
        const total = pricing?.total ?? cart.total
        clearStoredCartId()
        router.push(
          `/pedido/${result.order.id}/sucesso?cart_id=${cart.id}&display_id=${result.order.display_id}&total=${total}&method=${method}`
        )
      } else {
        setError("Não foi possível concluir o pedido. Tente novamente.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao finalizar o pedido.")
    } finally {
      setPlacing(false)
    }
  }

  if (cart === undefined) {
    return (
      <>
        <Header />
        <div className="max-w-container mx-auto px-4 py-10 text-textSecondary">Carregando...</div>
      </>
    )
  }
  if (!cart) return null

  const displayTotal = pricing?.total ?? cart.total

  return (
    <>
      <Header />
      <div className="max-w-container mx-auto px-4 py-6 pb-10 grid md:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">
          <div className="bg-surface border border-black/[.09] rounded overflow-hidden">
            <div
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #6FA6D6, #6FA6D6 33px, transparent 0, transparent 41px, #F18D9B 0, #F18D9B 74px, transparent 0, transparent 82px)",
                height: "3px",
              }}
            />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-sm">Endereço de Entrega</h2>
                <span className="text-[10px] bg-canvas px-1.5 py-0.5 rounded">Padrão</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <input
                  value={address.first_name}
                  onChange={(e) => setAddress({ ...address, first_name: e.target.value })}
                  placeholder="Nome"
                  className="border border-black/[.09] rounded px-2 py-1.5"
                />
                <input
                  value={address.last_name}
                  onChange={(e) => setAddress({ ...address, last_name: e.target.value })}
                  placeholder="Sobrenome"
                  className="border border-black/[.09] rounded px-2 py-1.5"
                />
                <input
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  placeholder="Telefone"
                  className="border border-black/[.09] rounded px-2 py-1.5"
                />
                <input
                  value={address.postal_code}
                  onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                  placeholder="CEP"
                  className="border border-black/[.09] rounded px-2 py-1.5"
                />
                <input
                  value={address.address_1}
                  onChange={(e) => setAddress({ ...address, address_1: e.target.value })}
                  placeholder="Endereço completo"
                  className="col-span-2 border border-black/[.09] rounded px-2 py-1.5"
                />
                <input
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="Cidade"
                  className="border border-black/[.09] rounded px-2 py-1.5"
                />
                <input
                  value={address.province}
                  onChange={(e) => setAddress({ ...address, province: e.target.value })}
                  placeholder="UF"
                  className="border border-black/[.09] rounded px-2 py-1.5"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                  className="col-span-2 border border-black/[.09] rounded px-2 py-1.5"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-black/[.09] rounded p-4">
            <h2 className="font-semibold text-sm mb-2">Pacotes</h2>
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1">
                <span className="line-clamp-1">
                  {item.quantity}x {item.title} ({item.variant_title})
                </span>
                <span>{formatBRL(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <textarea
              placeholder="Mensagem para o vendedor (opcional)"
              className="w-full border border-black/[.09] rounded px-2 py-1.5 text-sm mt-2"
              rows={2}
            />
            <div className="flex items-center justify-between text-sm mt-2">
              <span>Frete</span>
              <span>
                {useFreeShipping ? (
                  <>
                    <span className="line-through text-textSecondary mr-1">
                      {formatBRL(cart.shipping_total)}
                    </span>
                    <span className="text-freeShipping font-semibold">R$ 0,00</span>
                  </>
                ) : (
                  formatBRL(cart.shipping_total)
                )}
              </span>
            </div>
          </div>

          <div className="bg-surface border border-black/[.09] rounded p-4">
            <h2 className="font-semibold text-sm mb-3">Forma de Pagamento</h2>
            <div className="space-y-2">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!opt.enabled || toggling}
                  onClick={() => handleToggle({ method: opt.id })}
                  className={`w-full text-left px-3 py-2.5 rounded border text-sm ${
                    method === opt.id
                      ? "border-brand text-brand font-semibold bg-brand-light"
                      : "border-black/[.09]"
                  } ${!opt.enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {opt.label}
                  {!opt.enabled && " — indisponível nesta fase"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-black/[.09] rounded p-4 h-fit sticky top-4">
          <h2 className="font-semibold text-sm mb-3">Resumo Financeiro</h2>
          <div className="space-y-1.5 text-sm">
            <Row label="Subtotal dos Produtos" value={formatBRL(cart.item_total)} />
            <Row label="Total do Frete" value={formatBRL(cart.shipping_total)} />
            <Row
              label={
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={toggling}
                    checked={useFreeShipping}
                    onChange={(e) => handleToggle({ freeShipping: e.target.checked })}
                  />
                  Desconto de Frete
                </label>
              }
              value={`- ${formatBRL(pricing?.free_shipping_discount ?? 0)}`}
              negative
            />
            <Row
              label={
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={toggling}
                    checked={useCoupon}
                    onChange={(e) => handleToggle({ coupon: e.target.checked })}
                  />
                  Cupom do Vendedor
                </label>
              }
              value={`- ${formatBRL(pricing?.store_coupon_discount ?? 0)}`}
              negative
            />
            <Row
              label={
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={toggling}
                    checked={useCoins}
                    onChange={(e) => handleToggle({ coins: e.target.checked })}
                  />
                  Moedas Resgatadas
                </label>
              }
              value={`- ${formatBRL(pricing?.coins_discount ?? 0)}`}
              negative
            />
            <Row
              label="Desconto Pix Exclusivo"
              value={`- ${formatBRL(pricing?.pix_discount ?? 0)}`}
              negative
              highlight={method === "pix"}
            />
          </div>
          <div className="border-t border-black/[.09] mt-3 pt-3 flex items-center justify-between">
            <span className="font-semibold">Pagamento Total</span>
            <span className="text-brand font-extrabold text-xl">{formatBRL(displayTotal)}</span>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="w-full bg-brand text-white font-semibold py-3 rounded mt-4 disabled:opacity-50"
          >
            {placing ? "Processando..." : "Fazer Pedido →"}
          </button>
        </div>
      </div>
    </>
  )
}

function Row({
  label,
  value,
  negative,
  highlight,
}: {
  label: React.ReactNode
  value: string
  negative?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        negative ? (highlight ? "text-pixBadge font-semibold" : "text-textSecondary") : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
