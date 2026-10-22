import Link from "next/link"
import Header from "@/components/Header"
import BottomNav from "@/components/BottomNav"
import MaterialIcon from "@/components/MaterialIcon"

export default function ContaPage() {
  return (
    <>
      <Header />
      <section className="max-w-container mx-auto px-4 py-16 mb-20 md:mb-10 min-h-[50vh] flex flex-col items-center justify-center text-center">
        <MaterialIcon name="person" className="text-5xl mb-4 text-textSecondary" />
        <h1 className="text-xl font-bold text-textPrimary mb-2">Você ainda não entrou</h1>
        <p className="text-textSecondary text-sm mb-4">
          Entre na sua conta para ver pedidos, moedas e endereços salvos.
        </p>
        <Link
          href="/login?next=/conta"
          className="px-6 py-2 bg-brand text-white rounded font-semibold"
        >
          Entrar
        </Link>
      </section>
      <BottomNav />
    </>
  )
}
