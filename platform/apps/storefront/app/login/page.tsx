"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { brandConfig } from "@/config/brand.config"
import SliderCaptcha from "@/components/SliderCaptcha"
import QrLoginCanvas from "@/components/QrLoginCanvas"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [mode, setMode] = useState<"password" | "qrcode">("password")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [captchaOk, setCaptchaOk] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get("next") || "/"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captchaOk) {
      setStatus("Complete a verificação de segurança antes de continuar.")
      return
    }
    setSubmitting(true)
    setStatus(null)
    try {
      const res = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ email: identifier, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || "Credenciais inválidas.")
      }
      router.push(next)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 bg-header-gradient text-white items-center justify-center p-12">
        <div className="max-w-sm">
          <h1 className="text-3xl font-extrabold mb-3">{brandConfig.storeName}</h1>
          <p className="text-lg opacity-90">{brandConfig.storeTagline}</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-surface border border-black/[.09] rounded p-6">
          <div className="flex mb-4 border-b border-black/[.09]">
            <button
              onClick={() => setMode("password")}
              className={`flex-1 pb-2 text-sm font-semibold ${
                mode === "password" ? "text-brand border-b-2 border-brand" : "text-textSecondary"
              }`}
            >
              Entrar com senha
            </button>
            <button
              onClick={() => setMode("qrcode")}
              className={`flex-1 pb-2 text-sm font-semibold ${
                mode === "qrcode" ? "text-brand border-b-2 border-brand" : "text-textSecondary"
              }`}
            >
              QR Code
            </button>
          </div>

          {mode === "password" ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Telefone / E-mail / Usuário"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full border border-black/[.15] rounded px-3 py-2 text-sm outline-none focus:border-brand"
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-black/[.15] rounded px-3 py-2 text-sm outline-none focus:border-brand"
                required
              />
              <SliderCaptcha onVerified={setCaptchaOk} />
              {status && <p className="text-xs text-badgeOfficial">{status}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand text-white font-semibold py-2 rounded disabled:opacity-60"
              >
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <QrLoginCanvas seed={next} />
              <p className="text-xs text-textSecondary text-center">
                Abra o app e escaneie o código para entrar
              </p>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-black/[.09] flex flex-col gap-2">
            <button className="border border-black/[.15] rounded py-2 text-sm">
              Continuar com Google
            </button>
            <button className="border border-black/[.15] rounded py-2 text-sm">
              Continuar com Facebook
            </button>
            <button className="border border-black/[.15] rounded py-2 text-sm">
              Continuar com Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
