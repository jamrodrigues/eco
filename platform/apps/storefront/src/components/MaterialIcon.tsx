/**
 * Icone Material Symbols (Google Fonts, ligature font carregada em
 * app/layout.tsx). `name` e o nome do icone no catalogo
 * fonts.google.com/icons (ex: "two_wheeler", "tire_repair").
 */
export default function MaterialIcon({
  name,
  className = "",
}: {
  name: string
  className?: string
}) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  )
}
