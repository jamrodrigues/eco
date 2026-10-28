"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Header from "@/components/Header"
import BottomNav from "@/components/BottomNav"
import { getCurrentCustomer, getSessionToken, type CurrentCustomer } from "@/lib/auth"
import { listMyOrders, type MyOrder } from "@/lib/orders"

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

function formatBRL(amountCents: number) {
  return (amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function ContaPage() {
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CurrentCustomer | null>(null)
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const [me, myOrders] = await Promise.all([getCurrentCustomer(), listMyOrders(token)])
        setCustomer(me)
        setOrders(myOrders)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível carregar sua conta.")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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

  return (
    <>
      <Header />
      <section className="max-w-container mx-auto px-4 py-6 mb-20 md:mb-10">
        <h1 className="text-xl font-bold text-textPrimary mb-1">Olá, {customer.first_name || customer.email}</h1>
        <p className="text-textSecondary text-sm mb-6">{customer.email}</p>

        <h2 className="font-semibold text-sm mb-3">Meus pedidos</h2>

        {error && <p className="text-sm text-badgeOfficial mb-4">{error}</p>}

        {!error && orders.length === 0 && (
          <p className="text-textSecondary text-sm">Você ainda não fez nenhum pedido.</p>
        )}

        <div className="space-y-2">
          {orders.map((order) => (
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
      </section>
      <BottomNav />
    </>
  )
}
