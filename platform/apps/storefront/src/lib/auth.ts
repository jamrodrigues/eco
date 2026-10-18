"use client"

import { BACKEND_URL, PUBLISHABLE_KEY } from "./medusa"

/**
 * Sessão de cliente real (cadastro/login), distinta do carrinho anônimo
 * (que já existia desde a Fase 3 via localStorage). O token fica num
 * cookie comum (não httpOnly) de propósito: toda a camada de fetch do
 * storefront hoje é client-side (fetchJson/medusaFetch chamam o Medusa
 * direto do browser, sem proxy via Route Handler) — um cookie httpOnly
 * exigiria reescrever essa camada inteira para passar por rotas server
 * do Next. Ficou documentado aqui como tradeoff consciente: um XSS
 * nesta aplicação conseguiria ler o token, mas o storefront não injeta
 * HTML não confiável em lugar nenhum hoje. Se isso mudar (ex: descrição
 * de produto vindo de terceiros sem sanitização), revisitar.
 */
const SESSION_COOKIE = "session_token"
const SESSION_MAX_AGE_DAYS = 7

function setCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === "undefined") return
  const maxAge = maxAgeDays * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; path=/; max-age=0`
}

export function getSessionToken(): string | null {
  return readCookie(SESSION_COOKIE)
}

export function isLoggedIn(): boolean {
  return !!getSessionToken()
}

export function logoutCustomer() {
  clearCookie(SESSION_COOKIE)
}

async function authFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erro ${res.status}`)
  }
  return res.json()
}

export type CurrentCustomer = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  metadata: Record<string, unknown> | null
}

export async function getCurrentCustomer(): Promise<CurrentCustomer | null> {
  const token = getSessionToken()
  if (!token) return null
  try {
    const { customer } = await authFetch("/store/customers/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    return customer
  } catch {
    clearCookie(SESSION_COOKIE)
    return null
  }
}

export async function loginCustomer(email: string, password: string) {
  const { token } = await authFetch("/auth/customer/emailpass", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  setCookie(SESSION_COOKIE, token, SESSION_MAX_AGE_DAYS)
  return token
}

/**
 * Cadastro real (antes só existia login): cria a identidade de auth,
 * cria o Customer (o que vira has_account=true), registra o consentimento
 * LGPD e já efetua login pra obter o token "pleno" (o token do passo de
 * registro tem actor_id vazio — não serve pra chamadas autenticadas).
 */
export async function registerCustomer(opts: {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  privacy_accepted: boolean
  marketing_consent: boolean
}) {
  if (!opts.privacy_accepted) {
    throw new Error("É necessário aceitar a Política de Privacidade para criar a conta.")
  }

  const { token: registerToken } = await authFetch("/auth/customer/emailpass/register", {
    method: "POST",
    body: JSON.stringify({ email: opts.email, password: opts.password }),
  })

  await authFetch("/store/customers", {
    method: "POST",
    headers: { Authorization: `Bearer ${registerToken}` },
    body: JSON.stringify({
      email: opts.email,
      first_name: opts.first_name,
      last_name: opts.last_name,
      phone: opts.phone || undefined,
      metadata: {
        privacy_accepted_at: new Date().toISOString(),
        marketing_consent: opts.marketing_consent,
      },
    }),
  })

  return loginCustomer(opts.email, opts.password)
}
