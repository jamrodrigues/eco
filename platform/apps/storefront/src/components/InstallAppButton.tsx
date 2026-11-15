"use client"
import { useSyncExternalStore } from "react"
import { brandConfig } from "@/config/brand.config"
import {
  getDeferredPrompt,
  isIos,
  isStandalone,
  setDeferredPrompt,
  subscribeInstallPrompt,
} from "@/lib/pwa-install"

const noopSubscribe = () => () => {}

/**
 * Botao "Instalar app". Só aparece quando o navegador já entregou o
 * prompt de instalacao; no iPhone (que não tem o evento) mostra a instrucao
 * manual. Some quando o site ja esta rodando como app instalado.
 * No servidor assume "instalado" (não renderiza nada) pra não haver
 * divergencia de hidratação.
 */
export default function InstallAppButton() {
  const deferred = useSyncExternalStore(
    subscribeInstallPrompt,
    getDeferredPrompt,
    () => null
  )
  const standalone = useSyncExternalStore(noopSubscribe, isStandalone, () => true)
  const ios = useSyncExternalStore(noopSubscribe, isIos, () => false)

  if (!brandConfig.features.enablePwaInstallPrompt) return null
  if (standalone) return null

  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt()
          await deferred.userChoice
          setDeferredPrompt(null)
        }}
        className="mt-2 inline-flex items-center gap-1 rounded border border-black/[.09] px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-canvas"
      >
        Instalar app
      </button>
    )
  }

  if (ios) {
    return (
      <p className="text-xs text-textSecondary mt-2">
        No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início
      </p>
    )
  }

  return null
}
