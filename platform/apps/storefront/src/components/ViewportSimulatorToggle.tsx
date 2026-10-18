"use client"

import { useState } from "react"

/**
 * Seletor de simulacao de viewport para homologacao (secao 2 do doc da
 * Fase 2). Existe so neste ambiente de dev/QA — nao faz parte do chrome
 * real da loja.
 */
export default function ViewportSimulatorToggle() {
  const [mode, setMode] = useState<"auto" | "mobile">("auto")

  if (process.env.NODE_ENV === "production") return null

  return (
    <>
      <div
        data-testid="viewport-simulator"
        className="fixed bottom-20 md:bottom-4 right-4 z-[60] flex gap-1 bg-black/80 rounded-full p-1 text-xs text-white"
      >
        <button
          onClick={() => setMode("auto")}
          className={`px-3 py-1 rounded-full ${mode === "auto" ? "bg-brand" : ""}`}
        >
          💻 Desktop
        </button>
        <button
          onClick={() => setMode("mobile")}
          className={`px-3 py-1 rounded-full ${mode === "mobile" ? "bg-brand" : ""}`}
        >
          📱 375px
        </button>
      </div>
      {mode === "mobile" && (
        <style>{`
          body > div#__next-viewport-sim-target,
          main.viewport-sim-root {
            max-width: 375px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            border-left: 1px solid #ddd;
            border-right: 1px solid #ddd;
          }
          main.viewport-sim-root header .hidden.md\\:block { display: none !important; }
          main.viewport-sim-root header .md\\:hidden { display: flex !important; }
          main.viewport-sim-root .md\\:grid-cols-6 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          main.viewport-sim-root .hidden.md\\:flex { display: none !important; }
          main.viewport-sim-root .md\\:hidden.fixed { display: flex !important; }
          main.viewport-sim-root .md\\:flex-row { flex-direction: column !important; }
          main.viewport-sim-root .md\\:w-\\[480px\\] { width: 100% !important; }
        `}</style>
      )}
    </>
  )
}
