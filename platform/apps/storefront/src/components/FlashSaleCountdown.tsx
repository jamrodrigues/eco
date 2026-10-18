"use client"

import { useEffect, useState } from "react"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

/**
 * Isolado em seu proprio componente de folha: o setInterval atualiza
 * apenas este state local, nao o componente pai (secao 5 do doc da
 * Fase 2 — sem re-renderizacoes desnecessarias na pagina).
 */
export default function FlashSaleCountdown({ durationMs }: { durationMs: number }) {
  const [remaining, setRemaining] = useState(durationMs)

  useEffect(() => {
    const endsAt = Date.now() + durationMs
    const id = setInterval(() => {
      setRemaining(Math.max(0, endsAt - Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [durationMs])

  const totalSeconds = Math.floor(remaining / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60

  return (
    <div className="flex items-center gap-1">
      {[h, m, s].map((unit, i) => (
        <span key={i} className="flex items-center">
          <span className="bg-black text-white text-xs font-bold rounded px-1.5 py-0.5 min-w-[22px] text-center">
            {pad(unit)}
          </span>
          {i < 2 && <span className="text-black font-bold mx-0.5">:</span>}
        </span>
      ))}
    </div>
  )
}
