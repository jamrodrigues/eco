"use client"

import { useRef, useState } from "react"

/**
 * Captcha de quebra-cabeca deslizante (secao 4 do doc da Fase 2): o
 * usuario arrasta a peça até o fim da trilha para liberar o submit.
 */
export default function SliderCaptcha({ onVerified }: { onVerified: (ok: boolean) => void }) {
  const [x, setX] = useState(0)
  const [verified, setVerified] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const handleMove = (clientX: number) => {
    const track = trackRef.current
    if (!track || verified) return
    const rect = track.getBoundingClientRect()
    const max = rect.width - 36
    const next = Math.min(max, Math.max(0, clientX - rect.left - 18))
    setX(next)
    if (next >= max - 2) {
      setVerified(true)
      onVerified(true)
    }
  }

  return (
    <div
      ref={trackRef}
      className="relative h-9 bg-canvas border border-black/[.09] rounded select-none"
      onMouseMove={(e) => dragging.current && handleMove(e.clientX)}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      <span className="absolute inset-0 flex items-center justify-center text-xs text-textSecondary">
        {verified ? (
          <span className="inline-flex items-center gap-1">
            Verificado <span className="material-symbols-outlined text-[14px] leading-none">check</span>
          </span>
        ) : (
          "Arraste para verificar →"
        )}
      </span>
      <div
        className={`absolute top-0 left-0 h-9 w-9 flex items-center justify-center rounded cursor-grab active:cursor-grabbing text-white ${
          verified ? "bg-pixBadge" : "bg-brand"
        }`}
        style={{ transform: `translateX(${x}px)` }}
        onMouseDown={() => (dragging.current = true)}
        onTouchStart={() => (dragging.current = true)}
      >
        {verified ? (
          <span className="material-symbols-outlined text-[16px] leading-none">check</span>
        ) : (
          "➡"
        )}
      </div>
    </div>
  )
}
