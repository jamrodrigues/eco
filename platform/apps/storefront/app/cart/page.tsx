"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import VariantSwap from "@/components/VariantSwap"
import MaterialIcon from "@/components/MaterialIcon"
import { formatBRL } from "@/lib/medusa"
import {
  type Cart,
  type BrPricing,
  getCartIfExists,
  updateLineItemQuantity,
  removeLineItem,
  addLineItem,
  ensureGuestCustomer,
  applyBrDiscounts,
  addPromoCode,
  removePromoCode,
  STORE_COUPON_CODE,
  STORE_COUPON_MIN_SPEND,
  trueAvailableCoins,
  alreadyRedeemedCoins,
} from "@/lib/cart"

const SELLER_NAME = "Vruumoto Oficial"

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null | undefined>(undefined)
  const [pricing, setPricing] = useState<BrPricing | null>(null)
  const [coinsBalance, setCoinsBalance] = useState<number | null>(null)
  const [useCoupon, setUseCoupon] = useState(true)
  const [useFreeShipping, setUseFreeShipping] = useState(true)
  const [useCoins, setUseCoins] = useState(false)
  const [loading, setLoading] = useState(false)

  async function loadCart() {
    const c = await getCartIfExists()
    setCart(c)
    if (c && c.items.length > 0) {
      const alreadyUsingCoins = alreadyRedeemedCoins(c) > 0
      let balance: number | null = null
      if (alreadyUsingCoins) {
        const res = await ensureGuestCustomer(c.id)
        balance = res.coins_balance
        setCoinsBalance(balance)
      }
      setUseCoins(alreadyUsingCoins)
      await refreshPricingWith(alreadyUsingCoins, useCoupon, useFreeShipping, balance)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carregamento inicial do carrinho, não deriva de props/estado
    loadCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleToggleCoins(next: boolean) {
    if (!cart) return
    setLoading(true)
    try {
      let balance = coinsBalance
      if (balance === null) {
        const res = await ensureGuestCustomer(cart.id)
        balance = res.coins_balance
        setCoinsBalance(balance)
      }
      setUseCoins(next)
      await refreshPricingWith(next, useCoupon, useFreeShipping, balance)
    } finally {
      setLoading(false)
    }
  }

  async function refreshPricingWith(
    coinsOn: boolean,
    couponOn: boolean,
    freeShipOn: boolean,
    balanceOverride?: number | null
  ) {
    let fresh = await getCartIfExists()
    if (!fresh) return

    // Cupom agora é uma Promotion nativa — aplica/remove via
    // POST|DELETE /store/carts/:id/promotions, não mais um campo
    // numérico que o backend confiava cegamente.
    const eligibleCoupon = couponOn && fresh.item_subtotal >= STORE_COUPON_MIN_SPEND
    const couponCurrentlyApplied = fresh.item_total < fresh.item_subtotal
    if (eligibleCoupon && !couponCurrentlyApplied) {
      fresh = await addPromoCode(fresh.id, STORE_COUPON_CODE)
    } else if (!eligibleCoupon && couponCurrentlyApplied) {
      fresh = await removePromoCode(fresh.id, STORE_COUPON_CODE)
    }
    setCart(fresh)

    const balance = balanceOverride ?? coinsBalance
    const br = await applyBrDiscounts(fresh.id, {
      free_shipping: freeShipOn,
      coins_to_redeem: coinsOn ? Math.min(450, trueAvailableCoins(fresh, balance)) : 0,
      is_pix_selected: false,
    })
    setPricing(br)
  }

  async function handleQuantityChange(lineItemId: string, quantity: number) {
    if (!cart) return
    setLoading(true)
    try {
      await updateLineItemQuantity(cart.id, lineItemId, quantity)
      await refreshPricingWith(useCoins, useCoupon, useFreeShipping)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(lineItemId: string) {
    if (!cart) return
    setLoading(true)
    try {
      await removeLineItem(cart.id, lineItemId)
      await refreshPricingWith(useCoins, useCoupon, useFreeShipping)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwap(lineItemId: string, variantId: string, quantity: number) {
    if (!cart) return
    setLoading(true)
    try {
      await removeLineItem(cart.id, lineItemId)
      await addLineItem(cart.id, variantId, quantity)
      await refreshPricingWith(useCoins, useCoupon, useFreeShipping)
    } finally {
      setLoading(false)
    }
  }

  if (cart === undefined) {
    return (
      <>
        <Header />
        <div className="w-full max-w-container mx-auto px-4 py-10 text-textSecondary">Carregando...</div>
      </>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <>
        <Header />
        <div className="w-full max-w-container mx-auto px-4 py-16 text-center">
          <p className="text-textSecondary">Seu carrinho está vazio.</p>
          <Link href="/" className="text-brand font-semibold mt-2 inline-block">
            Voltar às compras
          </Link>
        </div>
      </>
    )
  }

  const displayTotal = pricing?.total ?? cart.total
  const savings =
    (pricing?.store_coupon_discount ?? 0) +
    (pricing?.free_shipping_discount ?? 0) +
    (pricing?.coins_discount ?? 0)

  return (
    <>
      <Header />
      <div className="w-full max-w-container mx-auto px-4 py-6 pb-32">
        <h1 className="text-lg font-semibold mb-4">Carrinho</h1>

        <div className="bg-surface border border-black/[.09] rounded overflow-hidden">
          <div className="px-4 py-3 bg-canvas border-b border-black/[.09] flex items-center gap-2 text-sm">
            <input type="checkbox" checked readOnly />
            <span className="bg-badgeOfficial text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              OFICIAL
            </span>
            <span className="font-semibold">{SELLER_NAME}</span>
            <span className="text-textSecondary flex items-center gap-1">
              | <MaterialIcon name="chat_bubble" className="text-xs" /> Conversar
            </span>
            {pricing && pricing.store_coupon_discount > 0 && (
              <span className="ml-auto text-brand text-xs">
                Cupom da Loja Aplicado: {formatBRL(pricing.store_coupon_discount)} OFF
              </span>
            )}
          </div>

          {cart.items.map((item) => (
            <div key={item.id} className="px-4 py-3 border-b border-black/[.06] last:border-0">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked readOnly className="mt-1 shrink-0" />
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded shimmer shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-2">{item.title}</p>
                  <VariantSwap
                    productHandle={item.product_handle}
                    currentVariantId={item.variant_id}
                    currentVariantTitle={item.variant_title}
                    onSwap={(variantId) => handleSwap(item.id, variantId, item.quantity)}
                  />
                </div>
              </div>
              <div className="flex items-center flex-wrap justify-between gap-2 mt-2 pl-7">
                <span className="text-sm text-textSecondary">{formatBRL(item.unit_price)}</span>
                <div className="flex items-center border border-black/[.09] rounded">
                  <button
                    onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                    className="w-7 h-7 text-sm"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    className="w-7 h-7 text-sm"
                  >
                    +
                  </button>
                </div>
                <span className="text-brand font-semibold">
                  {formatBRL(item.unit_price * item.quantity)}
                </span>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-textSecondary text-xs hover:text-brand"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-black/[.09] rounded mt-3 p-4 space-y-3">
          <label className="flex items-center justify-between text-sm cursor-pointer">
            <span>
              Cupom de Frete Grátis{" "}
              {useFreeShipping && (
                <span className="text-freeShipping inline-flex items-center gap-1">
                  Ativo <MaterialIcon name="check" className="text-xs" />
                </span>
              )}
            </span>
            <input
              type="checkbox"
              checked={useFreeShipping}
              disabled={loading}
              onChange={(e) => {
                setUseFreeShipping(e.target.checked)
                refreshPricingWith(useCoins, useCoupon, e.target.checked)
              }}
            />
          </label>
          <label className="flex items-center justify-between text-sm cursor-pointer">
            <span>Cupom da Loja (acima de R$ 50)</span>
            <input
              type="checkbox"
              checked={useCoupon}
              disabled={loading}
              onChange={(e) => {
                setUseCoupon(e.target.checked)
                refreshPricingWith(useCoins, e.target.checked, useFreeShipping)
              }}
            />
          </label>
          <label className="flex items-center justify-between text-sm cursor-pointer">
            <span>
              Moedas — Saldo: {coinsBalance ?? "..."} moedas
              {useCoins && ` = ${formatBRL(pricing?.coins_discount ?? 0)}`}
            </span>
            <input
              type="checkbox"
              checked={useCoins}
              disabled={loading}
              onChange={(e) => handleToggleCoins(e.target.checked)}
            />
          </label>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-black/[.09] z-40">
        <div className="max-w-container mx-auto px-4 py-3 flex items-center gap-4">
          <input type="checkbox" checked readOnly />
          <span className="text-sm">Selecionar Tudo</span>
          <div className="ml-auto text-right">
            {savings > 0 && (
              <p className="text-freeShipping text-xs">
                Economia total de {formatBRL(savings)} com cupons e moedas
              </p>
            )}
            <p className="text-brand font-extrabold text-xl">{formatBRL(displayTotal)}</p>
          </div>
          <button
            onClick={() => router.push("/checkout")}
            disabled={loading}
            className="bg-brand text-white font-semibold px-6 py-3 rounded disabled:opacity-50"
          >
            Finalizar Compra
          </button>
        </div>
      </div>
    </>
  )
}
