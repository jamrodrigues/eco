/**
 * Estado do prompt de instalacao do PWA (evento `beforeinstallprompt`).
 * O navegador entrega o evento uma vez; guardamos aqui pra o botao
 * "Instalar app" poder dispara-lo quando o visitante clicar.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function setDeferredPrompt(e: BeforeInstallPromptEvent | null): void {
  deferredPrompt = e
  listeners.forEach((cb) => cb())
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt
}

/** Notifica quando o prompt chega (ou e limpo). Retorna funcao de cancelamento. */
export function subscribeInstallPrompt(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
