"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { brandConfig } from "@/config/brand.config"
import { confirmPasswordReset } from "@/lib/auth"

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  )
}

function RedefinirSenhaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const email = searchParams.get("email") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await confirmPasswordReset(token, email, password)
      setDone(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível redefinir a senha. O link pode ter expirado."
      )
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
          <h2 className="font-bold text-lg mb-1">Redefinir senha</h2>

          {!token || !email ? (
            <p className="text-sm text-badgeOfficial mt-3">
              Link inválido. Peça um novo link em{" "}
              <Link href="/esqueci-senha" className="underline">
                Esqueci minha senha
              </Link>
              .
            </p>
          ) : done ? (
            <>
              <p className="text-sm text-textSecondary mt-3">
                Senha redefinida! Já pode entrar com a nova senha.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-brand text-white font-semibold py-2 rounded mt-4"
              >
                Ir para o login
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 mt-3">
              <input
                type="password"
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-black/[.15] rounded px-3 py-2 text-sm outline-none focus:border-brand"
                required
                minLength={8}
              />
              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-black/[.15] rounded px-3 py-2 text-sm outline-none focus:border-brand"
                required
                minLength={8}
              />
              {error && <p className="text-xs text-badgeOfficial">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand text-white font-semibold py-2 rounded disabled:opacity-60"
              >
                {submitting ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
