import { notFound } from "next/navigation"
import Header from "@/components/Header"
import PdpClient from "@/components/PdpClient"
import { getProductByHandle } from "@/lib/medusa"

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const product = await getProductByHandle(handle)
  if (!product) notFound()

  return (
    <>
      <Header />
      <PdpClient product={product} />
    </>
  )
}
