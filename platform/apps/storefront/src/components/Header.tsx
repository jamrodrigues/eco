"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { brandConfig } from "@/config/brand.config"
import MaterialIcon from "./MaterialIcon"
import { CART_CHANGED_EVENT, getCartIfExists } from "@/lib/cart"

const popularKeywords = ["Kit relação", "Pastilha de freio", "Capacete", "Óleo 10W30"]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const refreshCount = () => {
      getCartIfExists().then((cart) => {
        setCartCount(cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
      })
    }
    refreshCount()
    window.addEventListener(CART_CHANGED_EVENT, refreshCount)
    return () => window.removeEventListener(CART_CHANGED_EVENT, refreshCount)
  }, [])

  return (
    <header className="sticky top-0 z-50">
      {/* Desktop: 119px (34px top bar + 85px main bar) */}
      <div className="hidden md:block bg-header-gradient text-white h-header">
        <div className="h-headerTopBar max-w-container mx-auto flex items-center justify-end gap-4 px-4 text-xs">
          <Link href="/institucional/central-do-vendedor" className="opacity-90 hover:opacity-100">Central do Vendedor</Link>
          <Link href="/notificacoes" className="opacity-90 hover:opacity-100">Notificações</Link>
          <span className="opacity-70 cursor-default">Português</span>
          <Link href="/login" className="opacity-90 hover:opacity-100 font-semibold">Entrar</Link>
        </div>
        <div className="h-headerMainBar max-w-container mx-auto flex items-center gap-6 px-4">
          <Link href="/" className="flex items-center shrink-0">
            {brandConfig.logoImagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandConfig.logoImagePath}
                alt={brandConfig.storeName}
                className="h-16 w-auto object-contain"
              />
            ) : (
              <span className="text-2xl font-extrabold tracking-tight">
                {brandConfig.storeName}
              </span>
            )}
          </Link>
          <div className="flex-1 max-w-[840px]">
            <div className="flex bg-white rounded-sm overflow-hidden">
              <input
                type="text"
                placeholder="Buscar produtos, marcas e muito mais"
                className="flex-1 px-4 py-2 text-textPrimary text-sm outline-none"
              />
              <button className="bg-brand px-5 text-white flex items-center justify-center shrink-0" aria-label="Buscar">
                <MaterialIcon name="search" className="text-xl" />
              </button>
            </div>
            <div className="flex gap-3 mt-1 text-xs text-white/90">
              {popularKeywords.map((kw) => (
                <span key={kw} className="cursor-pointer hover:underline">{kw}</span>
              ))}
            </div>
          </div>
          <Link href="/cart" className="relative shrink-0">
            <MaterialIcon name="shopping_cart" className="text-2xl" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-badgeOfficial text-white text-[10px] font-bold leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile: compact bar, sempre no gradiente da marca (nao fica branco no scroll) */}
      <div
        className={`md:hidden flex items-center gap-2 px-3 py-2 bg-header-gradient text-white transition-shadow ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="flex-1 flex items-center rounded-full px-3 py-1.5 bg-white/95">
          <MaterialIcon name="search" className="text-base mr-2 text-textSecondary" />
          <input
            type="text"
            placeholder={`Buscar na ${brandConfig.storeName}`}
            className="flex-1 bg-transparent text-sm outline-none text-textPrimary"
          />
        </div>
        <Link href="/cart" className="relative">
          <MaterialIcon name="shopping_cart" className="text-xl" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-badgeOfficial text-white text-[9px] font-bold leading-none rounded-full min-w-[15px] h-[15px] px-1 flex items-center justify-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </Link>
        <Link href="/chat"><MaterialIcon name="chat_bubble" className="text-xl" /></Link>
      </div>
    </header>
  )
}
