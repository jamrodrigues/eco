import { NextRequest, NextResponse } from "next/server"
import { BACKEND_URL, PUBLISHABLE_KEY } from "@/lib/medusa"
import { brandConfig } from "@/config/brand.config"

export const config = {
  matcher: ["/((?!_next/|favicon.ico|images/|assets/).*)"],
}

export async function middleware(request: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/store/maintenance-status`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.next()

    const data = (await res.json()) as { is_enabled: boolean; message: string | null }
    if (!data.is_enabled) return NextResponse.next()

    const message = data.message || brandConfig.storeTagline

    const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${brandConfig.storeName} — Manutenção</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <div style="text-align:center;max-width:420px;padding:32px;">
      <h1 style="color:#EE4D2D;font-size:24px;margin-bottom:12px;">${brandConfig.storeName}</h1>
      <p style="color:#222222;font-size:16px;margin-bottom:8px;font-weight:600;">Estamos em manutenção, voltamos já.</p>
      <p style="color:#757575;font-size:14px;">${message}</p>
    </div>
  </body>
</html>`

    return new NextResponse(html, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  } catch {
    // Backend fora do ar: deixa passar, nao queremos travar o site por
    // causa do check de manutencao em si.
    return NextResponse.next()
  }
}
