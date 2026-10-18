"use client"

import { useEffect, useRef } from "react"
import QRCode from "qrcode"

export default function PixQrCanvas({ emv }: { emv: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && emv) {
      QRCode.toCanvas(canvasRef.current, emv, { width: 220, margin: 1 }).catch(() => {})
    }
  }, [emv])

  return <canvas ref={canvasRef} className="rounded" />
}
