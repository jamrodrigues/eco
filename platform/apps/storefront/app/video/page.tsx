import Header from "@/components/Header"
import BottomNav from "@/components/BottomNav"

export default function VideoPage() {
  return (
    <>
      <Header />
      <section className="w-full max-w-container mx-auto px-4 py-16 mb-20 md:mb-10 min-h-[50vh] flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-5xl leading-none mb-4">smart_display</span>
        <h1 className="text-xl font-bold text-textPrimary mb-2">Vídeos em breve</h1>
        <p className="text-textSecondary text-sm">
          Reviews e demonstrações de produtos em formato de vídeo estão a caminho.
        </p>
      </section>
      <BottomNav />
    </>
  )
}
