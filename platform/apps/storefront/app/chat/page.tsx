import Header from "@/components/Header"
import BottomNav from "@/components/BottomNav"
import MaterialIcon from "@/components/MaterialIcon"

export default function ChatPage() {
  return (
    <>
      <Header />
      <section className="max-w-container mx-auto px-4 py-16 mb-20 md:mb-10 min-h-[50vh] flex flex-col items-center justify-center text-center">
        <MaterialIcon name="chat_bubble" className="text-5xl mb-4 text-textSecondary" />
        <h1 className="text-xl font-bold text-textPrimary mb-2">Nenhuma conversa ainda</h1>
        <p className="text-textSecondary text-sm">
          Converse com vendedores diretamente pela página do produto.
        </p>
      </section>
      <BottomNav />
    </>
  )
}
