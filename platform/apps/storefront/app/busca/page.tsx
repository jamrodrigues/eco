import Header from "@/components/Header"
import ProductGrid from "@/components/ProductGrid"
import BottomNav from "@/components/BottomNav"
import Footer from "@/components/Footer"
import Link from "next/link"
import { getCategoryByHandle, listProducts } from "@/lib/medusa"

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string }>
}) {
  const params = await searchParams
  const q = (params.q ?? "").trim()
  const cat = params.categoria ? await getCategoryByHandle(params.categoria) : null

  const { products, count } = await listProducts({
    limit: 24,
    q: q || undefined,
    categoryId: cat?.id,
  })

  const title = cat
    ? cat.name
    : q
      ? `Resultados para “${q}”`
      : "Todos os produtos"

  // key: força remontar a grade quando busca/categoria muda na mesma rota,
  // senão o estado interno do ProductGrid mantém os resultados antigos.
  const gridKey = `${q}|${cat?.id ?? ""}`

  return (
    <>
      <Header />
      <section className="w-full max-w-container mx-auto px-4 mt-5 mb-20 md:mb-10">
        <h1 className="sticky top-0 md:top-header bg-canvas py-2 font-bold text-lg text-textPrimary z-10">
          {title}
        </h1>
        {products.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-textSecondary">Nenhum produto encontrado.</p>
            <Link href="/busca" className="inline-block mt-3 text-brand font-semibold hover:underline">
              Ver todos os produtos
            </Link>
          </div>
        ) : (
          <ProductGrid
            key={gridKey}
            initialProducts={products}
            initialCount={count}
            query={q || undefined}
            categoryId={cat?.id}
          />
        )}
      </section>
      <Footer />
      <BottomNav />
    </>
  )
}
