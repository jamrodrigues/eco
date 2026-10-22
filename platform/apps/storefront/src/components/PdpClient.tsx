"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { ProductDetail } from "@/lib/medusa"
import { findVariantBySelection, formatBRL, variantOptionMap } from "@/lib/medusa"
import { getOrCreateCart, addLineItem } from "@/lib/cart"
import { brandConfig } from "@/config/brand.config"
import {
  isMotorcycleCompatible,
  loadSelectedMotorcycle,
  type SelectedMotorcycle,
} from "@/data/motorcycle-fitment"
import ProductGallery from "./ProductGallery"
import SkuSelector from "./SkuSelector"
import CepCalculator from "./CepCalculator"
import Toast from "./Toast"
import BottomSheetDrawer from "./BottomSheetDrawer"
import SellerCard from "./SellerCard"
import SpecsTable from "./SpecsTable"
import ReviewsBlock from "./ReviewsBlock"
import MotorcycleFitmentBar from "./MotorcycleFitmentBar"
import MaterialIcon from "./MaterialIcon"
import manifest from "../../public/assets/manifest.json"

const manifestImageByHandle: Record<string, { src: string; alt: string }> = {
  "kit-relacao-transmissao-aco-1045-vruumoto-original": manifest.products.kit_relacao_freio,
}

const SELLER_NAME = "Vruumoto Oficial"

export default function PdpClient({ product }: { product: ProductDetail }) {
  const router = useRouter()
  const firstVariant = product.variants[0]
  const [selection, setSelection] = useState<Record<string, string>>(
    firstVariant ? variantOptionMap(product, firstVariant) : {}
  )
  const [quantity, setQuantity] = useState(1)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState<"add" | "buy" | null>(null)
  const [busy, setBusy] = useState(false)
  const [myBike, setMyBike] = useState<SelectedMotorcycle | null>(null)

  useEffect(() => {
    // Hidrata do localStorage so no mount (so existe no client).
    if (brandConfig.features.enableVehicleFitmentFilter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMyBike(loadSelectedMotorcycle())
    }
  }, [])

  const selectedVariant = useMemo(
    () => findVariantBySelection(product, selection),
    [product, selection]
  )

  const fitmentList = selectedVariant?.metadata?.compatible_motorcycles
  const isCompatible = myBike ? isMotorcycleCompatible(myBike, fitmentList) : null

  const price = selectedVariant?.calculated_price?.calculated_amount ?? 0
  const originalPrice = product.variants[0]?.calculated_price?.original_amount ?? price
  const hasDiscount = originalPrice > price
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0
  const pixPrice = Math.round(price * 0.9)
  const installment = (price / 3 / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

  const stock = selectedVariant?.inventory_quantity ?? 0

  function handleSelect(optionTitle: string, value: string) {
    const next = { ...selection, [optionTitle]: value }
    setSelection(next)
    setQuantity(1)
  }

  async function handleAddToCart(redirectToCheckout: boolean) {
    if (!selectedVariant || stock === 0) return
    setBusy(true)
    try {
      const cart = await getOrCreateCart()
      await addLineItem(cart.id, selectedVariant.id, quantity)
      if (redirectToCheckout) {
        router.push("/checkout")
        return
      }
      setToastMsg("✓ O produto foi adicionado ao seu carrinho!")
      setSheetOpen(null)
    } finally {
      setBusy(false)
    }
  }

  const manifestFallback = manifestImageByHandle[product.handle]
  const images = product.images?.length
    ? product.images.map((i) => i.url)
    : product.thumbnail
      ? [product.thumbnail]
      : manifestFallback
        ? [manifestFallback.src]
        : []

  return (
    <div className="max-w-container mx-auto px-4 py-6 pb-24 md:pb-10">
      {brandConfig.features.enableVehicleFitmentFilter && (
        <div className="mb-4">
          <MotorcycleFitmentBar onChange={setMyBike} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <ProductGallery images={images} title={product.title} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-badgeOfficial text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              OFICIAL
            </span>
          </div>
          <h1 className="text-lg font-semibold text-textPrimary">{product.title}</h1>
          <p className="text-sm text-textSecondary mt-1">
            4.8 ★★★★★ | 2,3 mil avaliações | 8,4 mil vendidos
          </p>

          <div className="bg-[#FAFAFA] p-4 rounded mt-3">
            <div className="flex items-baseline gap-2">
              {hasDiscount && (
                <span className="text-textSecondary line-through text-sm">
                  {formatBRL(originalPrice)}
                </span>
              )}
              <span className="text-brand font-extrabold text-[30px]">{formatBRL(price)}</span>
              {hasDiscount && (
                <span className="bg-badgeDiscount text-[#7A2E0E] text-xs font-bold px-1.5 py-0.5 rounded">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            <p className="text-pixBadge text-sm font-semibold mt-1">
              {formatBRL(pixPrice)} com Desconto Pix de 10% exclusivo
            </p>
            <p className="text-textSecondary text-xs mt-1">
              em até 3x {installment} sem juros no cartão
            </p>
          </div>

          <div className="mt-4">
            <SkuSelector product={product} selection={selection} onSelect={handleSelect} />
          </div>

          {brandConfig.features.enableVehicleFitmentFilter && isCompatible !== null && (
            <div
              className={`mt-3 px-3 py-2 rounded text-sm font-semibold flex items-center gap-1.5 ${
                isCompatible
                  ? "bg-freeShipping/10 text-freeShipping"
                  : "bg-badgeOfficial/10 text-badgeOfficial"
              }`}
            >
              <MaterialIcon name={isCompatible ? "check_circle" : "warning"} />
              {isCompatible
                ? `SERVE NA SUA MOTO: Compatível com ${myBike?.make} ${myBike?.model}`
                : `ATENÇÃO: Esta peça NÃO é compatível com ${myBike?.make} ${myBike?.model} ${myBike?.year}.`}
            </div>
          )}

          {brandConfig.features.enableOemPartNumberSearch &&
            (selectedVariant?.metadata?.oem_part_number ||
              selectedVariant?.metadata?.ean_barcode) && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-textSecondary">
                {selectedVariant?.metadata?.oem_part_number && (
                  <span>Cód. OEM: {selectedVariant.metadata.oem_part_number}</span>
                )}
                {selectedVariant?.metadata?.ean_barcode && (
                  <span>EAN: {selectedVariant.metadata.ean_barcode}</span>
                )}
              </div>
            )}

          <CepCalculator />

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center border border-black/[.09] rounded">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center text-lg"
              >
                −
              </button>
              <span className="w-10 text-center text-sm">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))}
                disabled={quantity >= stock}
                className="w-8 h-8 flex items-center justify-center text-lg disabled:opacity-30"
              >
                +
              </button>
            </div>
            <span className="text-xs text-textSecondary">
              {stock > 0 ? `${stock} em estoque` : "Esgotado"}
            </span>
          </div>

          <div className="hidden md:flex gap-3 mt-5">
            <button
              type="button"
              disabled={!selectedVariant || stock === 0 || busy}
              onClick={() => handleAddToCart(false)}
              className="flex-1 bg-brand-light border border-brand text-brand font-semibold py-3 rounded disabled:opacity-40"
            >
              Adicionar ao Carrinho
            </button>
            <button
              type="button"
              disabled={!selectedVariant || stock === 0 || busy}
              onClick={() => handleAddToCart(true)}
              className="flex-1 bg-brand text-white font-semibold py-3 rounded disabled:opacity-40"
            >
              Comprar Agora
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <SellerCard sellerName={SELLER_NAME} />
        <SpecsTable description={product.description} />
        <ReviewsBlock />
      </div>

      {/* Mobile fixed action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-black/[.09] px-3 py-2 flex items-center gap-2">
        <a
          href="/chat"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-freeShipping/10 text-freeShipping text-lg"
        >
          <MaterialIcon name="chat_bubble" />
        </a>
        <a
          href="/cart"
          className="w-11 h-11 flex items-center justify-center rounded-full bg-canvas text-lg"
        >
          <MaterialIcon name="shopping_cart" />
        </a>
        <button
          type="button"
          onClick={() => setSheetOpen("add")}
          disabled={stock === 0}
          className="flex-1 bg-brand-light border border-brand text-brand font-semibold py-3 rounded disabled:opacity-40"
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen("buy")}
          disabled={stock === 0}
          className="flex-1 bg-brand text-white font-semibold py-3 rounded disabled:opacity-40"
        >
          Comprar
        </button>
      </div>

      <BottomSheetDrawer open={sheetOpen !== null} onClose={() => setSheetOpen(null)}>
        <div className="flex gap-3">
          {images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt="" className="w-20 h-20 rounded object-cover shrink-0" />
          )}
          <div>
            <p className="text-brand font-extrabold text-lg">{formatBRL(price)}</p>
            <p className="text-xs text-textSecondary">
              {stock > 0 ? `${stock} em estoque` : "Esgotado"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <SkuSelector product={product} selection={selection} onSelect={handleSelect} />
        </div>
        <button
          type="button"
          disabled={!selectedVariant || stock === 0 || busy}
          onClick={() => handleAddToCart(sheetOpen === "buy")}
          className="w-full bg-brand text-white font-semibold py-3 rounded mt-5 disabled:opacity-40"
        >
          {sheetOpen === "buy" ? "Comprar Agora" : "Confirmar"}
        </button>
      </BottomSheetDrawer>

      <Toast
        message={toastMsg || ""}
        show={!!toastMsg}
        onDone={() => setToastMsg(null)}
      />
    </div>
  )
}
