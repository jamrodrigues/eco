const metrics = [
  { label: "Avaliações", value: "4.8" },
  { label: "Taxa de Resposta", value: "98%" },
  { label: "Tempo de Resposta", value: "~2h" },
  { label: "Produtos", value: "312" },
  { label: "Desde", value: "2021" },
  { label: "Seguidores", value: "48 mil" },
]

/** Dados de vendedor estáticos — o backend ainda não tem modelo de loja/vendedor (Fase 4+). */
export default function SellerCard({ sellerName }: { sellerName: string }) {
  return (
    <div className="bg-surface border border-black/[.09] rounded p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
          {sellerName.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-sm">{sellerName}</p>
          <p className="text-xs text-freeShipping">● Online agora</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="px-3 py-1.5 text-xs border border-black/[.09] rounded hover:border-brand inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] leading-none">chat</span> Conversar Agora
          </button>
          <button className="px-3 py-1.5 text-xs border border-black/[.09] rounded hover:border-brand">
            Ver Página da Loja
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4 text-center">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="font-semibold text-sm">{m.value}</p>
            <p className="text-[11px] text-textSecondary">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
