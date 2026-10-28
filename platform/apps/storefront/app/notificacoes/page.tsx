import Header from "@/components/Header"
import BottomNav from "@/components/BottomNav"
import MaterialIcon from "@/components/MaterialIcon"

export default function NotificacoesPage() {
  return (
    <>
      <Header />
      <section className="w-full max-w-container mx-auto px-4 py-16 mb-20 md:mb-10 min-h-[50vh] flex flex-col items-center justify-center text-center">
        <MaterialIcon name="notifications" className="text-5xl mb-4 text-textSecondary" />
        <h1 className="text-xl font-bold text-textPrimary mb-2">Nenhuma notificação por enquanto</h1>
        <p className="text-textSecondary text-sm">
          Novidades sobre seus pedidos, cupons e ofertas vão aparecer aqui.
        </p>
      </section>
      <BottomNav />
    </>
  )
}
