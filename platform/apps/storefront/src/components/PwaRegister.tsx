"use client"

import { useEffect } from "react"
import { brandConfig } from "@/config/brand.config"

/**
 * Registra o service worker só em produção (HTTPS real) e só se o
 * lojista deixou `enablePwaInstallPrompt` ligado no brand.config.ts.
 * O navegador decide sozinho quando mostrar o prompt "Instalar app" —
 * não existe um botão pra forçar isso, é critério dele (manifest
 * válido + SW registrado + engajamento mínimo do visitante).
 */
export default function PwaRegister() {
  useEffect(() => {
    if (!brandConfig.features.enablePwaInstallPrompt) return
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha ao registrar SW nao deve quebrar a loja — so perde o
      // prompt de instalacao.
    })
  }, [])

  return null
}
