"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { brandConfig } from "@/config/brand.config"
import { getCurrentCustomer, getSessionToken, logoutCustomer } from "@/lib/auth"

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!getSessionToken()) return
    getCurrentCustomer().then((customer) => {
      if (customer) setCustomerName(customer.first_name || customer.email)
    })
  }, [])

  return (
    <header className="sticky top-0 z-50">
      {/* Desktop: 119px (34px top bar + 85px main bar) */}
      <div className="hidden md:block bg-header-gradient text-white h-header">
        <div className="h-headerTopBar max-w-container mx-auto flex items-center justify-end gap-4 px-4 text-xs">
          {customerName ? (
            <div
              className="relative"
              onMouseEnter={() => setAccountMenuOpen(true)}
              onMouseLeave={() => setAccountMenuOpen(false)}
            >
              <button
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 opacity-90 hover:opacity-100 font-semibold"
              >
                <span className="material-symbols-outlined text-[18px] leading-none">account_circle</span>
                {customerName}
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 top-full w-40 bg-white text-textPrimary rounded shadow-lg border border-black/[.09] py-1 z-50">
                  <Link
                    href="/conta"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-3 py-2 text-xs hover:bg-black/[.03]"
                  >
                    Minha conta
                  </Link>
                  <button
                    onClick={() => {
                      logoutCustomer()
                      setAccountMenuOpen(false)
                      window.location.href = "/"
                    }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-black/[.03] text-badgeOfficial"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="opacity-90 hover:opacity-100 font-semibold">
              Entrar
            </Link>
          )}
        </div>
        <div className="h-headerMainBar max-w-container mx-auto flex items-center gap-6 px-4">
          <Link href="/" className="text-2xl font-extrabold tracking-tight shrink-0">
            {brandConfig.storeName}
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
          </div>
          <Link href="/cart" className="relative shrink-0">
            <span className="material-symbols-outlined text-[26px] leading-none">shopping_cart</span>
          </Link>
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
          <span className="material-symbols-outlined text-[16px] leading-none mr-2">photo_camera</span>
          <input
            type="text"
            placeholder="Buscar"
            className="flex-1 bg-transparent text-sm outline-none text-textPrimary"
          />
        </div>
        <Link href="/cart">
          <span className="material-symbols-outlined text-[22px] leading-none">shopping_cart</span>
        </Link>
        <Link href="/chat">
          <span className="material-symbols-outlined text-[22px] leading-none">chat</span>
        </Link>
      </div>
    </header>
  )
}
