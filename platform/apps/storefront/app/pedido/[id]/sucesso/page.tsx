"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import PixQrCanvas from "@/components/PixQrCanvas"
import Toast from "@/components/Toast"
import { formatBRL, BACKEND_URL } from "@/lib/medusa"
import { simulatePixPayment, type PixSessionData } from "@/lib/cart"
import MaterialIcon from "@/components/MaterialIcon"

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState("")
  useEffect(() => {
    if (!expiresAt) return
    const target = new Date(expiresAt).getTime()
    const tick = () => {
      const diff = Math.max(0, target - Date.now())
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0")
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0")
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0")
      setRemaining(`${h}:${m}:${s}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])
  return remaining
}

export default function OrderSuccessPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const cartId = searchParams.get("cart_id") || ""
  const displayId = searchParams.get("display_id")
  const total = Number(searchParams.get("total") || 0)
  const method = searchParams.get("method")

  const [pixSession, setPixSession] = useState<PixSessionData | null>(null)
  // Pix confirma de forma assíncrona (SSE abaixo). Cartão e boleto só chegam
  // nesta página depois que o pedido já foi criado com sucesso no backend,
  // então não há "aguardando liquidação" real pra mostrar pra eles.
  const [status, setStatus] = useState<"pending" | "paid">(method === "pix" ? "pending" : "paid")
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const countdown = useCountdown(pixSession?.expires_at ?? null)

  const orderNumber = displayId
    ? `${new Date().getFullYear()}${String(params.id).slice(-8).toUpperCase()}`
    : params.id

  useEffect(() => {
    if (method !== "pix" || !cartId) return
    try {
      const raw = window.localStorage.getItem(`pix_session_${cartId}`)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê dado externo (localStorage) na montagem, não deriva de props/estado
      if (raw) setPixSession(JSON.parse(raw))
    } catch {
      // sem localStorage — segue sem QR, só com o fallback de status
    }
  }, [cartId, method])

  useEffect(() => {
    if (!cartId || method !== "pix") return
    const es = new EventSource(`${BACKEND_URL}/pix-status/${cartId}`)
    eventSourceRef.current = es
    es.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.status === "paid") {
        setStatus("paid")
        es.close()
      }
    }
    return () => es.close()
  }, [cartId, method])

  async function handleSimulate() {
    if (!cartId) return
    await simulatePixPayment(cartId)
  }

  async function handleCopy() {
    if (!pixSession?.qr_code_emv) return
    try {
      await navigator.clipboard.writeText(pixSession.qr_code_emv)
      setToastMsg("Código Pix Copia e Cola copiado!")
    } catch {
      setToastMsg("Não foi possível copiar automaticamente.")
    }
  }

  return (
    <>
      <Header />
      <div className="w-full max-w-container mx-auto px-4 py-10 flex flex-col items-center text-center">
        {status === "paid" ? (
          <div className="bg-freeShipping/10 text-freeShipping font-bold text-lg rounded-full px-6 py-3 flex items-center gap-2">
            <MaterialIcon name="check_circle" className="text-xl leading-none" /> Pagamento Pix Compensado!
          </div>
        ) : (
          <div className="flex items-center gap-2 text-textSecondary text-sm">
            <span className="w-2 h-2 rounded-full bg-pixBadge animate-pulse" />
            Aguardando liquidação bancária automática...
          </div>
        )}

        <h1 className="text-xl font-semibold mt-4">Pedido realizado com sucesso!</h1>
        <p className="text-textSecondary text-sm mt-1">Número do pedido: {orderNumber}</p>
        {total > 0 && (
          <p className="text-brand font-extrabold text-2xl mt-2">{formatBRL(total)}</p>
        )}

        {method === "pix" && pixSession && status === "pending" && (
          <div className="bg-surface border border-black/[.09] rounded p-6 mt-6 max-w-sm w-full">
            <p className="text-sm text-textSecondary mb-2">
              Pix expira em <span className="font-mono font-semibold">{countdown}</span>
            </p>
            <div className="flex justify-center">
              <PixQrCanvas emv={pixSession.qr_code_emv} />
            </div>
            <div className="mt-4">
              <p className="text-xs text-textSecondary mb-1">Pix Copia e Cola</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pixSession.qr_code_emv}
                  className="flex-1 min-w-0 border border-black/[.09] rounded px-2 py-1.5 text-xs truncate"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-sm bg-brand text-white rounded shrink-0"
                >
                  Copiar
                </button>
              </div>
            </div>
            <button
              onClick={handleSimulate}
              className="w-full mt-4 border border-dashed border-brand text-brand text-sm py-2 rounded"
            >
              Simular Confirmação de Pagamento
            </button>
          </div>
        )}

        <Link href="/" className="text-brand text-sm font-semibold mt-8">
          Voltar à loja
        </Link>
      </div>

      <Toast message={toastMsg || ""} show={!!toastMsg} onDone={() => setToastMsg(null)} />
    </>
  )
}
