/**
 * Service worker básico para a PWA "Pra Frente".
 *
 * Estratégia:
 * - Chamadas à API (mesma origem que não seja um arquivo estático, ou qualquer
 *   requisição para outra origem — ex.: o backend em Railway) => network-only.
 *   Nunca cacheamos respostas da API: dados financeiros precisam estar sempre
 *   atualizados, e cache velho poderia mostrar saldo/registros desatualizados.
 * - Assets do app shell (JS/CSS/imagens/fonts gerados pelo `expo export -p web`,
 *   servidos da mesma origem) => cache-first, com atualização em segundo plano
 *   (stale-while-revalidate) para o app continuar abrindo rápido mesmo offline
 *   e se manter atualizado nas próximas visitas.
 */

const CACHE_NAME = 'pra-frente-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isApiRequest(url) {
  // Qualquer requisição para outra origem (ex.: EXPO_PUBLIC_API_URL apontando
  // para o Railway) é tratada como chamada de API — nunca cacheada.
  return url.origin !== self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isApiRequest(url)) {
    // network-only: deixa passar direto, sem interceptar nem cachear
    return;
  }

  // App shell (mesma origem): cache-first com atualização em segundo plano
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);

      return cached ?? fetchPromise;
    })
  );
});
