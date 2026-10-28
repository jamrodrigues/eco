import Header from "@/components/Header"
import HeroBanner from "@/components/HeroBanner"
import ServiceShortcuts from "@/components/ServiceShortcuts"
import FlashSaleSection from "@/components/FlashSaleSection"
import ProductGrid from "@/components/ProductGrid"
import BottomNav from "@/components/BottomNav"
import Footer from "@/components/Footer"
import { listProducts } from "@/lib/medusa"

export default async function HomePage() {
  const { products, count } = await listProducts({ limit: 24, offset: 0 })

  return (
    <>
      <Header />
      <HeroBanner />
      <ServiceShortcuts />
      <FlashSaleSection products={products} />

      <section className="w-full max-w-container mx-auto px-4 mt-5 mb-20 md:mb-10">
        <h2 className="sticky top-0 md:top-header bg-canvas py-2 font-bold text-lg text-textPrimary z-10">
          Descobertas do Dia
        </h2>
        <ProductGrid initialProducts={products} initialCount={count} />
      </section>

      <Footer />
      <BottomNav />
    </>
  )
}
