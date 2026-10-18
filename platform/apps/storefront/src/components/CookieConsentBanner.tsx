"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const STORAGE_KEY = "cookie_consent"

type Consent = {
  essential: true
  analytics: boolean
  decided_at: string
}

function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeConsent(analytics: boolean) {
  const consent: Consent = { essential: true, analytics, decided_at: new Date().toISOString() }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  } catch {
    // localStorage indisponível — o banner volta a aparecer na próxima
    // visita, o que é um fallback seguro (nunca rastreia sem registro).
  }
}

/**
 * Banner de consentimento de cookies (LGPD): cookies essenciais sempre
 * ligados (o carrinho/sessão não funcionam sem eles), analytics/
 * marketing desligado por padrão — só liga se o visitante autorizar
 * explicitamente (opt-in, não opt-out). Hoje não existe nenhum script
 * de analytics real rodando (ver grep em `grep -ri "gtag\|analytics\|pixel"`)
 * — isto só grava a preferência pra quando essa funcionalidade existir.
 */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [analyticsChecked, setAnalyticsChecked] = useState(false)

  useEffect(() => {
    // Leitura de localStorage (sistema externo) só é possível no client,
    // por isso o efeito em vez de computar no render — SSR não tem acesso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(!readConsent())
  }, [])

  if (!visible) return null

  function acceptAll() {
    writeConsent(true)
    setVisible(false)
  }

  function acceptEssentialOnly() {
    writeConsent(false)
    setVisible(false)
  }

  function saveCustom() {
    writeConsent(analyticsChecked)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-black/[.09] shadow-[0_-2px_12px_rgba(0,0,0,0.08)] p-4">
      <div className="max-w-container mx-auto">
        <p className="text-sm text-textPrimary mb-1">
          Usamos cookies essenciais para o funcionamento da loja. Com sua permissão, também
          gostaríamos de usar cookies de analytics para melhorar sua experiência.
        </p>
        <p className="text-xs text-textSecondary mb-3">
          Veja nossa{" "}
          <Link href="/institucional/cookies" target="_blank" className="text-brand underline">
            Política de Cookies
          </Link>
          .
        </p>

        {expanded && (
          <div className="mb-3 space-y-2 text-sm">
            <label className="flex items-center gap-2 opacity-60">
              <input type="checkbox" checked disabled />
              Cookies essenciais (sempre ativos)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={analyticsChecked}
                onChange={(e) => setAnalyticsChecked(e.target.checked)}
              />
              Cookies de analytics/marketing
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={acceptAll}
            className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded"
          >
            Aceitar todos
          </button>
          <button
            onClick={acceptEssentialOnly}
            className="px-4 py-2 border border-black/[.15] text-sm rounded"
          >
            Só essenciais
          </button>
          {expanded ? (
            <button onClick={saveCustom} className="px-4 py-2 border border-black/[.15] text-sm rounded">
              Salvar escolha
            </button>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="px-4 py-2 text-sm text-textSecondary underline"
            >
              Personalizar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
