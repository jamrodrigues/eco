import manifest from "../../public/assets/manifest.json"

const heroMain = manifest.banners.hero_main_1

export default function HeroBanner() {
  return (
    <section className="w-full max-w-container mx-auto px-0 md:px-4 mt-0 md:mt-3">
      {/* Mobile: full-bleed single carousel */}
      <div
        className="md:hidden relative w-full aspect-[375/180] bg-gradient-to-br from-brand to-[#FF6633] bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url(${heroMain.src})` }}
      >
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg px-6 text-center">
          Ofertas do dia com frete grátis
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/70" />
          ))}
        </div>
      </div>

      {/* Desktop: 2:1 split — carrossel 796x235 + 2 banners 398x115 */}
      <div className="hidden md:flex gap-2.5">
        <div
          className="relative w-[796px] h-[235px] rounded bg-gradient-to-br from-brand to-[#FF6633] bg-cover bg-center flex items-center justify-center overflow-hidden"
          style={{ backgroundImage: `url(${heroMain.src})` }}
          role="img"
          aria-label={heroMain.alt}
        >
          <div className="absolute inset-0 bg-black/25" />
          <span className="relative text-white font-bold text-2xl">
            Ofertas do dia com frete grátis
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="w-[398px] h-[115px] rounded bg-freeShipping/90 flex items-center justify-center text-white font-semibold">
            Frete Grátis acima de R$ 50
          </div>
          <div className="w-[398px] h-[115px] rounded bg-[#222222] flex items-center justify-center text-white font-semibold">
            Cupons exclusivos todo dia
          </div>
        </div>
      </div>
    </section>
  )
}
