"use client"

import { useEffect, useRef } from "react"

/**
 * Placeholder visual de QR Code desenhado em <canvas> (secao 4 do doc).
 * Gera um padrão pseudo-aleatorio determinístico a partir do `seed` —
 * suficiente para a UI de homologação; a geração real do payload de
 * pareamento com o app fica para uma fase posterior de integração.
 */
export default function QrLoginCanvas({ seed }: { seed: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const size = 180
    const cells = 18
    const cell = size / cells
    canvas.width = size
    canvas.height = size

    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = "#222222"

    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0

    for (let row = 0; row < cells; row++) {
      for (let col = 0; col < cells; col++) {
        hash = (hash * 1103515245 + 12345) >>> 0
        if (hash % 2 === 0) {
          ctx.fillRect(col * cell, row * cell, cell, cell)
        }
      }
    }

    // Marcadores de canto (estilo QR)
    ;[[0, 0], [cells - 3, 0], [0, cells - 3]].forEach(([r, c]) => {
      ctx.fillRect(c * cell, r * cell, cell * 3, cell * 3)
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(c * cell + cell, r * cell + cell, cell, cell)
      ctx.fillStyle = "#222222"
    })
  }, [seed])

  return <canvas ref={canvasRef} className="rounded border border-black/[.09]" />
}
