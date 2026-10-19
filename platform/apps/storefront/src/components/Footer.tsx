import Link from "next/link"
import { brandConfig } from "@/config/brand.config"

const ATENDIMENTO = [
  { label: "Central de Ajuda", slug: "central-de-ajuda" },
  { label: "Como Comprar", slug: "como-comprar" },
  { label: "Como Vender", slug: "como-vender" },
  { label: "Devoluções e Reembolsos", slug: "devolucoes-reembolsos" },
  { label: "Entrega", slug: "entrega" },
  { label: "Pagamento", slug: "pagamento" },
  { label: "Fale Conosco", slug: "fale-conosco" },
]
const SOBRE = [
  { label: "Sobre Nós", slug: "sobre-nos" },
  { label: "Políticas", slug: "politicas" },
  { label: "Carreiras", slug: "carreiras" },
  { label: "Blog", slug: "blog" },
  { label: "Vendedores Oficiais", slug: "vendedores-oficiais" },
  { label: "Marketing e Afiliados", slug: "marketing-e-afiliados" },
  { label: "Imprensa", slug: "imprensa" },
]
const PAGAMENTOS = ["Pix", "Visa", "Mastercard", "Elo", "Boleto", "Carteira Digital"]
const SELOS = ["Site Seguro SSL", "Dados Criptografados", "Compra Garantida"]

export default function Footer() {
  return (
    <footer className="hidden md:block bg-white mt-10">
      <div className="h-[3px] bg-brand" />
      <div className="max-w-container mx-auto px-4 py-10 grid grid-cols-5 gap-8 text-sm">
        <div>
          <h3 className="font-bold text-textPrimary mb-3">Atendimento ao Cliente</h3>
          <ul className="space-y-2 text-textSecondary">
            {ATENDIMENTO.map((item) => (
              <li key={item.slug}>
                <Link href={`/institucional/${item.slug}`} className="hover:text-brand hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-textPrimary mb-3">Sobre a {brandConfig.storeName}</h3>
          <ul className="space-y-2 text-textSecondary">
            {SOBRE.map((item) => (
              <li key={item.slug}>
                <Link href={`/institucional/${item.slug}`} className="hover:text-brand hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-textPrimary mb-3">Formas de Pagamento</h3>
          <div className="flex flex-wrap gap-2">
            {PAGAMENTOS.map((item) => (
              <span
                key={item}
                className="px-2 py-1 border border-black/[.09] rounded text-xs text-textSecondary"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-textPrimary mb-3">Compra Segura</h3>
          <ul className="space-y-2 text-textSecondary">
            {SELOS.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span className="text-freeShipping">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-textPrimary mb-3">Baixe o App</h3>
          <div className="w-24 h-24 bg-canvas border border-black/[.09] rounded flex items-center justify-center text-[10px] text-textSecondary text-center p-1">
            QR Code do App
          </div>
          <p className="text-xs text-textSecondary mt-2">
            Escaneie para baixar o app {brandConfig.storeName}
          </p>
        </div>
      </div>

      <div className="border-t border-black/[.09] py-4 space-y-1">
        <p className="max-w-container mx-auto px-4 text-xs text-textSecondary">
          © {new Date().getFullYear()} {brandConfig.storeName}. {brandConfig.storeTagline}
        </p>
        {brandConfig.legalName && (
          <p className="max-w-container mx-auto px-4 text-[11px] text-textSecondary">
            {brandConfig.legalName}
            {brandConfig.cnpj && ` — CNPJ ${brandConfig.cnpj}`}
            {brandConfig.address && ` — ${brandConfig.address}`}
            {brandConfig.supportEmail && ` — ${brandConfig.supportEmail}`}
          </p>
        )}
        {brandConfig.developedByLabel && (
          <p className="max-w-container mx-auto px-4 text-[11px] text-textSecondary">
            {brandConfig.developedByUrl ? (
              <a
                href={brandConfig.developedByUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand hover:underline"
              >
                {brandConfig.developedByLabel}
              </a>
            ) : (
              brandConfig.developedByLabel
            )}
          </p>
        )}
      </div>
    </footer>
  )
}
