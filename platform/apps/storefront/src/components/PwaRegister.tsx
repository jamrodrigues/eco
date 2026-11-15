"use client"

import { useEffect } from "react"
import { brandConfig } from "@/config/brand.config"
import {
  setDeferredPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install"

/**
 * Registra o service worker só em produção (HTTPS real) e só se o
 * lojista deixou `enablePwaInstallPrompt` ligado no brand.config.ts.
 * O navegador decide sozinho quando disponibiliza o prompt "Instalar app"
 * (manifest válido + SW registrado + engajamento mínimo do visitante);
 * guardamos o evento pra o botão `InstallAppButton` poder disparar.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (!brandConfig.features.enablePwaInstallPrompt) return
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferredPrompt(null)
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

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
