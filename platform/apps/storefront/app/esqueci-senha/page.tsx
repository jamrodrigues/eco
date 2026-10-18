"use client"

import { useState } from "react"
import Link from "next/link"
import { brandConfig } from "@/config/brand.config"
import { requestPasswordReset } from "@/lib/auth"

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch {
      // Não revela se o e-mail existe ou não — mesma mensagem sempre.
      setSent(true)
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
          <h2 className="font-bold text-lg mb-1">Esqueci minha senha</h2>
          {sent ? (
            <>
              <p className="text-sm text-textSecondary mt-3">
                Se esse e-mail tiver uma conta, enviamos um link pra redefinir a senha.
                Confira sua caixa de entrada.
              </p>
              <Link href="/login" className="block text-center text-brand text-sm mt-4">
                Voltar para o login
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 mt-3">
              <p className="text-sm text-textSecondary">
                Informe seu e-mail de cadastro.
              </p>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-black/[.15] rounded px-3 py-2 text-sm outline-none focus:border-brand"
                required
              />
              {error && <p className="text-xs text-badgeOfficial">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand text-white font-semibold py-2 rounded disabled:opacity-60"
              >
                {submitting ? "Enviando..." : "Enviar link de redefinição"}
              </button>
              <Link href="/login" className="block text-center text-xs text-textSecondary hover:text-brand">
                Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
