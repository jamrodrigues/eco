"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Script from "next/script"
import Header from "@/components/Header"
import { formatBRL, getShippingByCep } from "@/lib/medusa"
import {
  type Cart,
  type BrPricing,
  getCartIfExists,
  linkCustomerToCart,
  getCartCoins,
  updateCartDetails,
  addShippingMethod,
  applyBrDiscounts,
  addPromoCode,
  removePromoCode,
  STORE_COUPON_CODE,
  STORE_COUPON_MIN_SPEND,
  createPaymentCollection,
  createPaymentSession,
  completeCart,
  fetchActivePaymentGateway,
  getPaymentProviderIdForGateway,
  trueAvailableCoins,
  alreadyRedeemedCoins,
  clearStoredCartId,
} from "@/lib/cart"
import { getCurrentCustomer, getSessionToken } from "@/lib/auth"

const STANDARD_SHIPPING_OPTION_ID = process.env.NEXT_PUBLIC_STANDARD_SHIPPING_OPTION_ID || ""
const EXPRESS_SHIPPING_OPTION_ID = process.env.NEXT_PUBLIC_EXPRESS_SHIPPING_OPTION_ID || ""
const PICKUP_SHIPPING_OPTION_ID = process.env.NEXT_PUBLIC_PICKUP_SHIPPING_OPTION_ID || ""
const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || ""

/**
 * Mercado Pago JS SDK v2 (`https://sdk.mercadopago.com/js/v2`) has no
 * official TypeScript types for the vanilla `window.MercadoPago` global
 * (the published `@mercadopago/sdk-js` npm package is just a tiny loader).
 * These are the minimal shapes this page actually touches: Secure Fields
 * (iframe-mounted card number/expiry/CVV inputs — the card data itself
 * never reaches this page's JS context, only MP's own iframes) and
 * `createCardToken`, per MP's current "Checkout API" Core Methods guide.
 */
type MpFieldElement = {
  unmount: () => void
  // `binChange` fires as the shopper types a card number into the Secure
  // Field iframe — it's how we learn the card's BIN (first 6 digits)
  // *without* ever reading the PAN ourselves, per MP's Core Methods guide.
  on: (event: "binChange", callback: (data: { bin: string }) => void) => void
}
type MpFieldBuilder = { mount: (elementId: string) => MpFieldElement }
type MpTokenizeError = { cause?: { code?: string; description?: string }[]; message?: string }
type MpInstance = {
  fields: {
    create: (fieldType: string, options: Record<string, unknown>) => MpFieldBuilder
    createCardToken: (data: {
      cardholderName: string
      identificationType: string
      identificationNumber: string
    }) => Promise<{ id: string }>
  }
  getPaymentMethods: (data: { bin: string }) => Promise<{ results: { id: string }[] }>
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: Record<string, unknown>) => MpInstance
  }
}

// Mapeamento best-effort dos códigos de erro de validação client-side do
// SDK da Mercado Pago (tabela "Data entry errors" da doc oficial) para
// mensagens em pt-BR. Um código não mapeado cai na mensagem genérica.
const MP_FIELD_ERROR_MESSAGES: Record<string, string> = {
  "205": "Informe o número do cartão.",
  "208": "Selecione o mês de validade.",
  "209": "Selecione o ano de validade.",
  "212": "Informe o tipo de documento.",
  "213": "Informe o documento do titular.",
  "214": "Informe o CPF do titular do cartão.",
  "220": "Selecione o banco emissor.",
  "221": "Informe o nome impresso no cartão.",
  "224": "Informe o código de segurança (CVV).",
  E203: "Código de segurança (CVV) inválido.",
  E301: "Número de cartão inválido.",
  "316": "Nome do titular inválido.",
  "322": "Tipo de documento inválido.",
  "323": "Documento do titular inválido.",
  "324": "CPF inválido.",
  "325": "Mês de validade inválido.",
  "326": "Ano de validade inválido — verifique se o cartão não está vencido.",
}

function describeMpTokenError(err: unknown): string {
  const cause = (err as MpTokenizeError)?.cause
  if (Array.isArray(cause) && cause.length > 0) {
    const messages = cause
      .map((c) => (c.code && MP_FIELD_ERROR_MESSAGES[c.code]) || c.description)
      .filter((m): m is string => Boolean(m))
    if (messages.length > 0) return Array.from(new Set(messages)).join(" ")
  }
  if (err instanceof Error && err.message) return err.message
  return "Não foi possível validar os dados do cartão. Verifique e tente novamente."
}

type ShippingMethodId = "standard" | "express" | "pickup"

const shippingMethodOptions: {
  id: ShippingMethodId
  optionId: string
  label: string
  description: string
}[] = [
  {
    id: "standard",
    optionId: STANDARD_SHIPPING_OPTION_ID,
    label: "Padrão (Transportadora / Correios)",
    description: "3 a 7 dias úteis",
  },
  {
    id: "express",
    optionId: EXPRESS_SHIPPING_OPTION_ID,
    label: "Expresso Local (Motoboy)",
    description: "mesmo dia / dia seguinte — só na sua cidade",
  },
  {
    id: "pickup",
    optionId: PICKUP_SHIPPING_OPTION_ID,
    label: "Retirar na Loja",
    description: "grátis, Loja Física Matriz",
  },
]

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
  const [shippingMethod, setShippingMethod] = useState<ShippingMethodId>("standard")
  const [hyperlocalAvailable, setHyperlocalAvailable] = useState(false)
  const [changingShipping, setChangingShipping] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cardHolderName, setCardHolderName] = useState("")
  const [installments, setInstallments] = useState(1)
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
  const [mpReady, setMpReady] = useState(false)
  const mpRef = useRef<MpInstance | null>(null)
  const mpFieldsRef = useRef<{
    cardNumber?: MpFieldElement
    expirationDate?: MpFieldElement
    securityCode?: MpFieldElement
  }>({})

  const [address, setAddress] = useState({
    first_name: "Cliente",
    last_name: "Convidado",
    phone: "11999999999",
    address_1: "Av. Paulista, 1000",
    city: "São Paulo",
    province: "SP",
    postal_code: "01310-100",
    country_code: "br",
    cpf: "",
  })
  const [email, setEmail] = useState("")

  async function recalc(
    c: Cart,
    coinsOn: boolean,
    couponOn: boolean,
    freeShipOn: boolean,
    pixOn: boolean,
    balanceOverride?: number | null
  ) {
    let fresh = c
    const eligibleCoupon = couponOn && fresh.item_subtotal >= STORE_COUPON_MIN_SPEND
    const couponCurrentlyApplied = fresh.item_total < fresh.item_subtotal
    if (eligibleCoupon && !couponCurrentlyApplied) {
      fresh = await addPromoCode(fresh.id, STORE_COUPON_CODE)
      setCart(fresh)
    } else if (!eligibleCoupon && couponCurrentlyApplied) {
      fresh = await removePromoCode(fresh.id, STORE_COUPON_CODE)
      setCart(fresh)
    }

    const balance = balanceOverride ?? coinsBalance
    const br = await applyBrDiscounts(fresh.id, {
      free_shipping: freeShipOn,
      coins_to_redeem: coinsOn ? Math.min(450, trueAvailableCoins(fresh, balance)) : 0,
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

      // O middleware já bloqueia /checkout sem cookie de sessão, mas
      // confere de novo aqui (ex: sessão expirada do lado do Medusa
      // mas o cookie ainda presente) antes de vincular o carrinho.
      const token = getSessionToken()
      const customer = token ? await getCurrentCustomer() : null
      if (!token || !customer) {
        router.push(`/login?next=/checkout`)
        return
      }
      setEmail(customer.email)
      setAddress((prev) => ({
        ...prev,
        first_name: customer.first_name || prev.first_name,
        last_name: customer.last_name || prev.last_name,
      }))

      await linkCustomerToCart(c.id, token)
      if (c.shipping_methods.length === 0 && STANDARD_SHIPPING_OPTION_ID) {
        await addShippingMethod(c.id, STANDARD_SHIPPING_OPTION_ID)
      }
      const { coins_balance } = await getCartCoins(c.id)
      setCoinsBalance(coins_balance)
      const fresh = await getCartIfExists()
      setCart(fresh)
      const alreadyUsingCoins = alreadyRedeemedCoins(fresh) > 0
      setUseCoins(alreadyUsingCoins)
      if (fresh) await recalc(fresh, alreadyUsingCoins, true, true, true, coins_balance)
      checkHyperlocal(address.postal_code)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Monta os Secure Fields da Mercado Pago (iframes próprios da MP para
  // número do cartão, validade e CVV — esses dados nunca chegam ao JS
  // desta página, só ao iframe da MP) só quando o método "card" está
  // selecionado e o SDK já carregou. Desmonta ao trocar de método/sair
  // da página pra não deixar iframes órfãos.
  //
  // O listener `binChange` no field de número do cartão é como
  // descobrimos a bandeira (payment_method_id, ex: "master"/"visa") sem
  // nunca ler o PAN: a MP só nos entrega o BIN (6 primeiros dígitos) do
  // cartão sendo digitado, e `mp.getPaymentMethods({ bin })` devolve os
  // métodos de pagamento compatíveis com esse BIN — mesmo mecanismo do
  // guia oficial "Checkout API / Core Methods".
  useEffect(() => {
    if (!mpReady || method !== "card") return
    const mp = mpRef.current
    if (!mp) return

    setPaymentMethodId(null)
    const fieldStyle = { style: { fontSize: "14px", color: "#111827" } }
    const cardNumberField = mp.fields
      .create("cardNumber", { placeholder: "0000 0000 0000 0000", ...fieldStyle })
      .mount("mp-card-number")
    mpFieldsRef.current.cardNumber = cardNumberField
    mpFieldsRef.current.expirationDate = mp.fields
      .create("expirationDate", { placeholder: "MM/AA", ...fieldStyle })
      .mount("mp-card-expiry")
    mpFieldsRef.current.securityCode = mp.fields
      .create("securityCode", { placeholder: "CVV", ...fieldStyle })
      .mount("mp-card-cvv")

    cardNumberField.on("binChange", async (data) => {
      if (!data.bin) {
        setPaymentMethodId(null)
        return
      }
      try {
        const { results } = await mp.getPaymentMethods({ bin: data.bin })
        setPaymentMethodId(results?.[0]?.id ?? null)
      } catch {
        setPaymentMethodId(null)
      }
    })

    return () => {
      mpFieldsRef.current.cardNumber?.unmount()
      mpFieldsRef.current.expirationDate?.unmount()
      mpFieldsRef.current.securityCode?.unmount()
      mpFieldsRef.current = {}
      setPaymentMethodId(null)
    }
  }, [mpReady, method])

  /**
   * Tokeniza o cartão no cliente via Mercado Pago (nunca manda número,
   * validade ou CVV pro nosso backend — só o token de uso único que a
   * própria MP gera, mais a bandeira detectada via BIN). Erros de
   * validação (cartão inválido, vencido, CVV errado, CPF faltando,
   * bandeira não identificada) são pegos aqui e lançados com mensagem em
   * pt-BR; quem chama deixa isso cair no catch de handlePlaceOrder, que
   * já exibe via setError.
   */
  async function tokenizeCard(): Promise<{
    token: string
    installments: number
    payment_method_id: string
  }> {
    const mp = mpRef.current
    if (!mp) {
      throw new Error(
        "Não foi possível carregar o Mercado Pago. Atualize a página e tente novamente."
      )
    }
    if (!cardHolderName.trim()) {
      throw new Error("Informe o nome impresso no cartão.")
    }
    const cpfDigits = address.cpf.replace(/\D/g, "")
    if (!cpfDigits) {
      throw new Error("Informe o CPF do titular do cartão (campo CPF acima).")
    }
    if (!paymentMethodId) {
      throw new Error(
        "Não foi possível identificar a bandeira do cartão. Verifique o número digitado."
      )
    }

    try {
      const token = await mp.fields.createCardToken({
        cardholderName: cardHolderName.trim(),
        identificationType: "CPF",
        identificationNumber: cpfDigits,
      })
      return { token: token.id, installments, payment_method_id: paymentMethodId }
    } catch (err) {
      throw new Error(describeMpTokenError(err))
    }
  }

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

  async function checkHyperlocal(postalCode: string) {
    const digits = postalCode.replace(/\D/g, "")
    if (digits.length !== 8) return
    try {
      const data = await getShippingByCep(digits)
      setHyperlocalAvailable(data.hyperlocal_match)
    } catch {
      setHyperlocalAvailable(false)
    }
  }

  async function handleShippingMethodChange(next: ShippingMethodId) {
    const opt = shippingMethodOptions.find((o) => o.id === next)
    if (!cart || !opt?.optionId || changingShipping || shippingMethod === next) return
    setChangingShipping(true)
    try {
      await addShippingMethod(cart.id, opt.optionId)
      setShippingMethod(next)
      const fresh = await getCartIfExists()
      if (!fresh) return
      setCart(fresh)
      await recalc(fresh, useCoins, useCoupon, useFreeShipping, method === "pix")
    } finally {
      setChangingShipping(false)
    }
  }

  async function handlePlaceOrder() {
    if (!cart) return
    setPlacing(true)
    setError(null)
    try {
      // Resolve o gateway ativo ANTES de qualquer coisa específica da MP: se
      // o admin trocou pro Pagar.me (ex.: MP fora do ar), o cartão não pode
      // depender do SDK/public key da Mercado Pago.
      const gateway = await fetchActivePaymentGateway()
      const providerId = getPaymentProviderIdForGateway(
        gateway,
        method as "pix" | "card" | "boleto"
      )

      // Tokeniza antes de tocar no carrinho: se a MP recusar os dados do
      // cartão (número/validade/CVV/CPF inválido), não queremos ter
      // atualizado endereço nem criado payment collection pra nada.
      const cardSessionData =
        method === "card"
          ? gateway === "mercadopago"
            ? { ...(await tokenizeCard()), cart_id: cart.id }
            : { cart_id: cart.id }
          : undefined

      await updateCartDetails(cart.id, {
        email,
        shipping_address: address,
      })
      await recalc(cart, useCoins, useCoupon, useFreeShipping, method === "pix")

      const paymentCollection = await createPaymentCollection(cart.id)
      const sessionData =
        method === "boleto"
          ? { payer_cpf: address.cpf.replace(/\D/g, ""), cart_id: cart.id }
          : method === "pix"
            ? { cart_id: cart.id }
            : cardSessionData
      const session = await createPaymentSession(paymentCollection.id, providerId, sessionData)

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
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onLoad={() => {
          if (!MP_PUBLIC_KEY || !window.MercadoPago) return
          mpRef.current = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" })
          setMpReady(true)
        }}
      />
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
                  onBlur={(e) => checkHyperlocal(e.target.value)}
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
                <input
                  value={address.cpf}
                  onChange={(e) => setAddress({ ...address, cpf: e.target.value })}
                  placeholder="CPF (obrigatório para Boleto/Cartão)"
                  required={method === "boleto" || method === "card"}
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

            <h3 className="text-xs font-semibold text-textSecondary mt-3 mb-1.5">
              Modalidade de Envio
            </h3>
            <div className="space-y-1.5">
              {shippingMethodOptions.map((opt) => {
                const disabled =
                  !opt.optionId ||
                  changingShipping ||
                  (opt.id === "express" && !hyperlocalAvailable)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleShippingMethodChange(opt.id)}
                    className={`w-full text-left px-3 py-2 rounded border text-sm flex items-center justify-between ${
                      shippingMethod === opt.id
                        ? "border-brand text-brand font-semibold bg-brand-light"
                        : "border-black/[.09]"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span>
                      {opt.label}
                      <span className="block text-[11px] font-normal text-textSecondary">
                        {opt.id === "express" && !hyperlocalAvailable
                          ? "indisponível para este CEP"
                          : opt.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between text-sm mt-3">
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

            {method === "card" && (
              <div className="mt-3 pt-3 border-t border-black/[.09] space-y-2">
                <input
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                  placeholder="Nome impresso no cartão"
                  className="w-full border border-black/[.09] rounded px-2 py-1.5 text-sm"
                />
                {/* Divs vazios — a Mercado Pago monta um iframe próprio
                    em cada um (Secure Fields). Número, validade e CVV
                    nunca passam pelo state/JS desta página. */}
                <div
                  id="mp-card-number"
                  className="border border-black/[.09] rounded px-2 py-1.5 text-sm h-[38px]"
                />
                {paymentMethodId && (
                  <p className="text-[11px] text-textSecondary">
                    Bandeira detectada: {paymentMethodId}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    id="mp-card-expiry"
                    className="border border-black/[.09] rounded px-2 py-1.5 text-sm h-[38px]"
                  />
                  <div
                    id="mp-card-cvv"
                    className="border border-black/[.09] rounded px-2 py-1.5 text-sm h-[38px]"
                  />
                </div>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full border border-black/[.09] rounded px-2 py-1.5 text-sm"
                >
                  <option value={1}>1x sem juros</option>
                  <option value={2}>2x sem juros</option>
                  <option value={3}>3x sem juros</option>
                </select>
                <p className="text-[11px] text-textSecondary">
                  Informe também o CPF do titular no campo CPF acima.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-surface border border-black/[.09] rounded p-4 h-fit sticky top-4">
          <h2 className="font-semibold text-sm mb-3">Resumo Financeiro</h2>
          <div className="space-y-1.5 text-sm">
            <Row label="Subtotal dos Produtos" value={formatBRL(cart.item_subtotal)} />
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
