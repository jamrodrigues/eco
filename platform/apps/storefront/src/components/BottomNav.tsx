import Link from "next/link"
import MaterialIcon from "./MaterialIcon"

const tabs = [
  { icon: "home", label: "Início", href: "/" },
  { icon: "movie", label: "Vídeo", href: "/video" },
  { icon: "live_tv", label: "Live", href: "/live" },
  { icon: "notifications", label: "Notificações", href: "/notificacoes" },
  { icon: "person", label: "Eu", href: "/conta" },
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
          <MaterialIcon name={tab.icon} className="text-lg leading-none" />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  )
}
