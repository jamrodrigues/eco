"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { brandConfig } from "@/config/brand.config"

const popularKeywords = ["Kit relação", "Pastilha de freio", "Capacete", "Óleo 10W30"]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
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
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {brandConfig.logoImagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandConfig.logoImagePath}
                alt={brandConfig.storeName}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : null}
            <span className="text-2xl font-extrabold tracking-tight">
              {brandConfig.storeName}
            </span>
          </Link>
          <div className="flex-1 max-w-[840px]">
            <div className="flex items-center bg-white rounded-sm overflow-hidden">
              <input
                type="text"
                placeholder="Buscar produtos, marcas e muito mais"
                className="flex-1 px-4 py-2 text-textPrimary text-sm outline-none"
              />
              <button className="bg-brand px-5 py-2 text-white text-sm font-medium">
                Buscar
              </button>
            </div>
            <div className="flex gap-3 mt-1 text-xs text-white/90">
              {popularKeywords.map((kw) => (
                <span key={kw} className="cursor-pointer hover:underline">{kw}</span>
              ))}
            </div>
          </div>
          <Link href="/cart" className="relative shrink-0 text-2xl">🛒</Link>
        </div>
      </div>

      {/* Mobile: compact bar, transparent -> solid on scroll */}
      <div
        className={`md:hidden flex items-center gap-2 px-3 py-2 transition-colors ${
          scrolled ? "bg-white shadow-sm" : "bg-transparent"
        }`}
      >
        <div
          className={`flex-1 flex items-center rounded-full px-3 py-1.5 ${
            scrolled ? "bg-canvas" : "bg-white/90"
          }`}
        >
          <span className="text-sm mr-2">📷</span>
          <input
            type="text"
            placeholder="Buscar"
            className="flex-1 bg-transparent text-sm outline-none text-textPrimary"
          />
        </div>
        <Link href="/cart" className="text-xl">🛒</Link>
        <Link href="/chat" className="text-xl">💬</Link>
      </div>
    </header>
  )
}
