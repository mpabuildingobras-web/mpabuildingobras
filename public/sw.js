// Service worker do app instalável (PWA).
// Regra: a rede sempre vem primeiro. O cache só entra quando não há internet,
// para a equipe nunca ficar presa numa versão velha do app.
// Atualizou e ninguém recebeu? Suba o número da versão abaixo (v1 -> v2) e publique.
const VERSAO = 'mpa-obras-v1'
const TELA_OFFLINE = '/offline.html'
const GUARDAR_NA_INSTALACAO = [TELA_OFFLINE, '/icons/icon-192.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      .then((cache) => cache.addAll(GUARDAR_NA_INSTALACAO))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== VERSAO).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  const url = new URL(pedido.url)

  // Supabase e qualquer outro endereço de fora: o service worker não toca.
  // Os dados vêm sempre frescos da rede.
  if (url.origin !== self.location.origin) return
  // Só leitura entra no cache. Gravação nunca.
  if (pedido.method !== 'GET') return

  // Abrir o app ou trocar de página: rede; sem internet, a tela offline.
  if (pedido.mode === 'navigate') {
    evento.respondWith(
      fetch(pedido).catch(() => caches.match(TELA_OFFLINE)),
    )
    return
  }

  // Arquivos do próprio app (código, estilo, ícones): rede primeiro;
  // se der certo, guarda uma cópia; sem internet, usa a cópia guardada.
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone()
          caches.open(VERSAO).then((cache) => cache.put(pedido, copia))
        }
        return resposta
      })
      .catch(() => caches.match(pedido).then((guardada) => guardada || Response.error())),
  )
})
