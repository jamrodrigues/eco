import { notFound } from "next/navigation"
import Link from "next/link"
import { institutionalPages } from "@/content/institutional-pages"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import BottomNav from "@/components/BottomNav"

export function generateStaticParams() {
  return Object.keys(institutionalPages).map((slug) => ({ slug }))
}

export default async function InstitutionalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = institutionalPages[slug]
  if (!page) notFound()

  return (
    <>
      <Header />
      <section className="max-w-container mx-auto px-4 py-10 mb-20 md:mb-10 min-h-[50vh]">
        <Link href="/" className="text-sm text-brand hover:underline">
          ← Voltar para a Home
        </Link>
        <h1 className="text-2xl font-bold text-textPrimary mt-4 mb-4">{page.title}</h1>
        <div className="space-y-3 text-textSecondary max-w-2xl">
          {page.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>
      <Footer />
      <BottomNav />
    </>
  )
}
