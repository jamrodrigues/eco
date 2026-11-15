import Header from "@/components/Header"
import HeroBanner from "@/components/HeroBanner"
import ServiceShortcuts from "@/components/ServiceShortcuts"
import FlashSaleSection from "@/components/FlashSaleSection"
import ProductGrid from "@/components/ProductGrid"
import BottomNav from "@/components/BottomNav"
import Footer from "@/components/Footer"
import MotorcycleFitmentBar from "@/components/MotorcycleFitmentBar"
import { brandConfig } from "@/config/brand.config"
import { getFlashSale, listProducts } from "@/lib/medusa"

export default async function HomePage() {
  const { products, count } = await listProducts({ limit: 24, offset: 0 })
  const sale = await getFlashSale()
  // Sem product_ids, listProducts devolveria o catalogo inteiro: nao buscar.
  const saleProducts =
    sale.active && sale.product_ids.length > 0
      ? (await listProducts({ ids: sale.product_ids, limit: 12 })).products
      : []

  return (
    <>
      <Header />
      <HeroBanner />
      {brandConfig.features.enableVehicleFitmentFilter && (
        <div className="max-w-container mx-auto px-4 mt-3">
          <MotorcycleFitmentBar />
        </div>
      )}
      <ServiceShortcuts />
      {sale.active && saleProducts.length > 0 && (
        <section id="ofertas">
          <FlashSaleSection
            title={sale.title}
            endsAt={sale.ends_at}
            products={saleProducts}
          />
        </section>
      )}

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
