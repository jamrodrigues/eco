// Service worker mínimo — existe principalmente para satisfazer o
// critério de "instalável" do navegador (manifest + SW com fetch
// handler). Cache-first só para os ícones/manifest estáticos; todo o
// resto passa direto pra rede (sem cache de API/HTML, que mudam o
// tempo todo nesta loja).
const CACHE_NAME = "pwa-shell-v1"
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (!SHELL_ASSETS.some((path) => event.request.url.endsWith(path))) return
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
