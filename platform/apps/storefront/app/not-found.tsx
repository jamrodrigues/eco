import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import BottomNav from "@/components/BottomNav"

export default function NotFound() {
  return (
    <>
      <Header />
      <section className="w-full max-w-container mx-auto px-4 py-20 mb-20 md:mb-10 min-h-[50vh] flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-6xl leading-none mb-4">search</span>
        <h1 className="text-2xl font-bold text-textPrimary mb-2">
          Página não encontrada
        </h1>
        <p className="text-textSecondary text-sm mb-6">
          O link que você acessou pode estar quebrado, ou a página foi removida.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 bg-brand text-white rounded font-semibold"
        >
          Voltar para a Home
        </Link>
      </section>
      <Footer />
      <BottomNav />
    </>
  )
}
