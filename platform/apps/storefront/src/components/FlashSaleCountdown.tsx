"use client"

import { useEffect, useState } from "react"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function remainingMs(endsAt: string) {
  return Math.max(0, Date.parse(endsAt) - Date.now())
}

/**
 * Isolado em seu proprio componente de folha: o setInterval atualiza
 * apenas este state local, nao o componente pai (secao 5 do doc da
 * Fase 2 — sem re-renderizacoes desnecessarias na pagina).
 * Conta ate o instante real `endsAt`; ao chegar em zero fica em 00:00:00.
 */
export default function FlashSaleCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(() => remainingMs(endsAt))

  useEffect(() => {
    const tick = () => setRemaining(remainingMs(endsAt))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

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
