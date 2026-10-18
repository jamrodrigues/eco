"use client"

import { useState } from "react"
import { getShippingByCep, formatBRL } from "@/lib/medusa"

function maskCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

export default function CepCalculator() {
  const [cep, setCep] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof getShippingByCep>> | null>(null)

  async function handleCalculate() {
    const digits = cep.replace(/\D/g, "")
    if (digits.length !== 8) {
      setError("CEP precisa ter 8 dígitos")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getShippingByCep(digits)
      setResult(data)
    } catch {
      setError("Não foi possível calcular o frete agora.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <p className="text-xs text-textSecondary mb-1.5">Calcular frete e prazo</p>
      <div className="flex gap-2">
        <input
          value={cep}
          onChange={(e) => setCep(maskCep(e.target.value))}
          placeholder="00000-000"
          maxLength={9}
          className="border border-black/[.09] rounded px-3 py-1.5 text-sm w-32 outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={handleCalculate}
          disabled={loading}
          className="px-4 py-1.5 text-sm border border-black/[.09] rounded hover:border-brand disabled:opacity-50"
        >
          {loading ? "Calculando..." : "Calcular"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {result && (
        <div className="mt-2 text-sm space-y-1.5">
          {result.address.cidade && (
            <p className="text-textSecondary">
              {result.address.logradouro ? `${result.address.logradouro}, ` : ""}
              {result.address.cidade}/{result.address.uf}
            </p>
          )}
          {result.shipping_options.map((opt) => (
            <div
              key={opt.code}
              className="flex items-center justify-between border border-black/[.09] rounded px-3 py-2"
            >
              <span>{opt.name}</span>
              <span className="font-semibold">{formatBRL(opt.amount)}</span>
            </div>
          ))}
          {result.hyperlocal_match && (
            <p className="text-freeShipping text-xs font-semibold">
              🚚 Frete Grátis com cupom disponível para sua região
            </p>
          )}
        </div>
      )}
    </div>
  )
}
