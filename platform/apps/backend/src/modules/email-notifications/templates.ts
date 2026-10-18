const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "EcoShop Brasil"
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:3000"
const BRAND_COLOR = "#EE4D2D"

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function layout(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:24px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:${BRAND_COLOR};padding:20px 24px;">
            <span style="color:#fff;font-size:20px;font-weight:800;">${STORE_NAME}</span>
          </td></tr>
          <tr><td style="padding:24px;">
            <h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:16px 24px;background:#FAFAFA;color:#757575;font-size:12px;">
            ${STORE_NAME} — este é um e-mail automático, não responda.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export function orderConfirmationEmail(opts: {
  displayId: string | number
  total: number
  items: { title: string; quantity: number; unit_price: number }[]
  isPix: boolean
}) {
  const itemsHtml = opts.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0;font-size:14px;">${i.quantity}x ${i.title}</td><td style="padding:4px 0;font-size:14px;text-align:right;">${brl(i.unit_price * i.quantity)}</td></tr>`
    )
    .join("")

  const pixNote = opts.isPix
    ? `<p style="font-size:13px;color:#757575;">Pagando com Pix? O QR Code e o código copia-e-cola estão na tela de confirmação do seu pedido — o link some rápido, então finalize por lá.</p>`
    : ""

  return {
    subject: `Pedido #${opts.displayId} confirmado — ${STORE_NAME}`,
    html: layout(
      `Recebemos seu pedido #${opts.displayId}!`,
      `<table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
       <p style="font-weight:700;font-size:16px;margin-top:12px;border-top:1px solid #eee;padding-top:12px;">Total: ${brl(opts.total)}</p>
       ${pixNote}
       <p style="font-size:14px;"><a href="${STOREFRONT_URL}" style="color:${BRAND_COLOR};">Acompanhar meus pedidos</a></p>`
    ),
  }
}

export function welcomeEmail(opts: { firstName: string | null }) {
  const name = opts.firstName || "por aqui"
  return {
    subject: `Bem-vindo(a) à ${STORE_NAME}!`,
    html: layout(
      `Oi, ${name}! Sua conta foi criada.`,
      `<p style="font-size:14px;">Agora você pode acompanhar pedidos, guardar endereços e acumular moedas em cada compra.</p>
       <p style="font-size:14px;"><a href="${STOREFRONT_URL}" style="color:${BRAND_COLOR};">Começar a comprar</a></p>`
    ),
  }
}

export function passwordResetEmail(opts: { resetUrl: string }) {
  return {
    subject: `Redefinir sua senha — ${STORE_NAME}`,
    html: layout(
      "Pediram a redefinição da sua senha",
      `<p style="font-size:14px;">Se foi você, clique no botão abaixo. O link expira em 15 minutos.</p>
       <p><a href="${opts.resetUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700;">Redefinir senha</a></p>
       <p style="font-size:12px;color:#757575;">Se não foi você, ignore este e-mail — sua senha continua a mesma.</p>`
    ),
  }
}
