import Link from "next/link"

const tabs = [
  { icon: "🏠", label: "Início", href: "/" },
  { icon: "🎬", label: "Vídeo", href: "/video" },
  { icon: "🔴", label: "Live", href: "/live" },
  { icon: "👤", label: "Eu", href: "/conta" },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/[.09] flex">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className="flex-1 flex flex-col items-center justify-center py-1.5 text-[11px] text-textSecondary"
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  )
}
