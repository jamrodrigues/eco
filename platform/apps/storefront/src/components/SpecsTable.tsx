export default function SpecsTable({
  description,
  category,
}: {
  description: string | null
  category?: string
}) {
  const rows = [
    { label: "Categoria", value: category || "Geral" },
    { label: "Estoque", value: "Disponível" },
    { label: "Material", value: "Ver descrição" },
    { label: "Origem", value: "Nacional" },
    { label: "Envio de", value: "São Paulo, SP" },
  ]

  return (
    <div className="bg-surface border border-black/[.09] rounded p-4">
      <h3 className="font-semibold text-sm mb-3">Ficha Técnica</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-black/[.06] last:border-0">
              <td className="py-1.5 text-textSecondary w-40">{row.label}</td>
              <td className="py-1.5">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {description && (
        <p className="text-sm text-textPrimary mt-4 whitespace-pre-line">{description}</p>
      )}
    </div>
  )
}
