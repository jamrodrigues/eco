"use client"

import { useEffect, useState } from "react"

export default function Toast({
  message,
  show,
  onDone,
}: {
  message: string
  show: boolean
  onDone: () => void
}) {
  const [visible, setVisible] = useState(show)

  useEffect(() => {
    if (!show) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reseta a animação de fade quando um novo toast chega enquanto o anterior ainda estava sumindo
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 1800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] bg-black/80 text-white px-6 py-3 rounded-lg text-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {message}
    </div>
  )
}
