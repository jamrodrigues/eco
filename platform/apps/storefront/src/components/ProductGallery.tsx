"use client"

import { useRef, useState } from "react"
import MaterialIcon from "./MaterialIcon"

export default function ProductGallery({
  images,
  title,
}: {
  images: string[]
  title: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const list = images.length ? images : []
  const active = list[activeIndex]

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoom({ x, y })
  }

  return (
    <div className="w-full md:w-[480px] shrink-0">
      <div
        ref={frameRef}
        className="relative w-full aspect-square bg-canvas rounded overflow-hidden cursor-zoom-in"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setZoom(null)}
      >
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full shimmer" />
        )}
        {zoom && active && (
          <div
            className="hidden md:block absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${active})`,
              backgroundSize: "200%",
              backgroundPosition: `${zoom.x}% ${zoom.y}%`,
            }}
          />
        )}
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 mt-2">
          {list.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => setActiveIndex(i)}
              className={`w-16 h-16 rounded overflow-hidden border-2 ${
                i === activeIndex ? "border-brand" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-sm text-textSecondary">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-brand flex items-center gap-1"
        >
          <MaterialIcon name="share" className="text-base" /> Compartilhar
        </a>
        <button type="button" className="hover:text-brand flex items-center gap-1">
          <MaterialIcon name="favorite" className="text-base" /> Favoritar

        </button>
      </div>
    </div>
  )
}
