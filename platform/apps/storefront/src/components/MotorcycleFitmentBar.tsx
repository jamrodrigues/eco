"use client"

import { useEffect, useState } from "react"
import {
  MOTORCYCLE_MAKES,
  MOTORCYCLE_MODELS_BY_MAKE,
  MOTORCYCLE_YEARS,
  loadSelectedMotorcycle,
  saveSelectedMotorcycle,
  type SelectedMotorcycle,
} from "@/data/motorcycle-fitment"

/**
 * "Minha Garagem / Serve na Minha Moto?" — 3 dropdowns encadeados
 * (Montadora → Modelo → Ano). Salva a escolha no localStorage pra toda
 * a loja lembrar (doc Fase 5, seção 3A).
 */
export default function MotorcycleFitmentBar({
  onChange,
}: {
  onChange?: (bike: SelectedMotorcycle | null) => void
}) {
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")
  const [year, setYear] = useState("")

  useEffect(() => {
    // Hidrata do localStorage so no mount (so existe no client) — nao da
    // pra usar lazy initializer porque o SSR nao tem window.localStorage.
    const saved = loadSelectedMotorcycle()
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMake(saved.make)
      setModel(saved.model)
      setYear(String(saved.year))
      onChange?.(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function commit(nextMake: string, nextModel: string, nextYear: string) {
    if (nextMake && nextModel && nextYear) {
      const bike: SelectedMotorcycle = { make: nextMake, model: nextModel, year: Number(nextYear) }
      saveSelectedMotorcycle(bike)
      onChange?.(bike)
    }
  }

  const models = make ? MOTORCYCLE_MODELS_BY_MAKE[make] || [] : []

  return (
    <div className="bg-[#18181B] text-white rounded px-4 py-3 flex flex-col md:flex-row items-stretch md:items-center gap-2">
      <span className="font-semibold text-sm whitespace-nowrap shrink-0">
        🏍️ Serve na Minha Moto?
      </span>
      <div className="flex flex-1 gap-2">
        <select
          value={make}
          onChange={(e) => {
            setMake(e.target.value)
            setModel("")
            commit(e.target.value, "", year)
          }}
          className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1.5 text-sm"
        >
          <option value="">Montadora</option>
          {MOTORCYCLE_MAKES.map((m) => (
            <option key={m} value={m} className="text-textPrimary">
              {m}
            </option>
          ))}
        </select>
        <select
          value={model}
          disabled={!make}
          onChange={(e) => {
            setModel(e.target.value)
            commit(make, e.target.value, year)
          }}
          className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1.5 text-sm disabled:opacity-40"
        >
          <option value="">Modelo</option>
          {models.map((m) => (
            <option key={m} value={m} className="text-textPrimary">
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          disabled={!model}
          onChange={(e) => {
            setYear(e.target.value)
            commit(make, model, e.target.value)
          }}
          className="flex-1 bg-white/10 border border-white/20 rounded px-2 py-1.5 text-sm disabled:opacity-40"
        >
          <option value="">Ano</option>
          {MOTORCYCLE_YEARS.map((y) => (
            <option key={y} value={y} className="text-textPrimary">
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
