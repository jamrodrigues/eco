"use client"
import { useEffect, useRef } from "react"
import QRCode from "qrcode"

export default function SiteQrCanvas({ url, size }: { url: string; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && url) {
      QRCode.toCanvas(canvasRef.current, url, { width: size, margin: 1 }).catch(() => {})
    }
  }, [url, size])

  return <canvas ref={canvasRef} className="rounded" />
}
