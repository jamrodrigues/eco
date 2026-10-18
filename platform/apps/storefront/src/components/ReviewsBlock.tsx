"use client"

import { useState } from "react"

const filters = ["Todas", "5 Estrelas", "4 Estrelas", "Com Comentários", "Com Fotos/Vídeos"]

const mockReviews = [
  { name: "j*****3", variant: "Preto, M", text: "Chegou rápido, tecido ótimo!", stars: 5 },
  { name: "m*****a", variant: "Bege, P", text: "Caimento perfeito, recomendo.", stars: 5 },
  { name: "c*****o", variant: "Terracota, M", text: "Cor um pouco diferente da foto.", stars: 4 },
]

/** Avaliações mock — ainda não há backend de reviews (fora de escopo da Fase 3). */
export default function ReviewsBlock() {
  const [active, setActive] = useState("Todas")

  return (
    <div className="bg-surface border border-black/[.09] rounded p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-sm">Avaliações</h3>
        <span className="text-brand font-bold">4.8 de 5</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className={`text-xs px-3 py-1 rounded-full border ${
              active === f
                ? "border-brand text-brand"
                : "border-black/[.09] text-textSecondary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {mockReviews.map((r, i) => (
          <div key={i} className="border-b border-black/[.06] pb-3 last:border-0">
            <p className="text-sm font-semibold">
              {r.name} <span className="text-textSecondary font-normal">· {r.variant}</span>
            </p>
            <p className="text-xs text-badgeDiscount">{"★".repeat(r.stars)}</p>
            <p className="text-sm text-textPrimary mt-1">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
