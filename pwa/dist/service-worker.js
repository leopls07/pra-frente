/**
 * Service worker básico para a PWA "Pra Frente".
 *
 * Estratégia:
 * - Navegação (carregamento de página/HTML) => network-first, com fallback pro cache
 *   só se a rede falhar (offline). O `expo export -p web` gera um arquivo .html por
 *   rota, e cada novo deploy sobrescreve esse HTML na mesma URL — se cache-first fosse
 *   usado aqui, um dispositivo que já visitou o site antes ficaria preso numa versão
 *   antiga até dois reloads depois do deploy. Com network-first, a versão nova aparece
 *   já no próximo carregamento real.
 * - Assets do app shell com nome hasheado (JS/CSS/fontes gerados pelo `expo export`,
 *   em `/_expo/static/...` e `/assets/...`) => cache-first: são imutáveis por definição
 *   (o nome muda se o conteúdo mudar), então cache-first aqui é seguro e mantém o app
 *   rápido/funcionando offline sem risco de conteúdo desatualizado.
 * - Chamadas à API (outra origem, ex.: o backend em Railway) => network-only. Nunca
 *   cacheamos dados financeiros do usuário.
 */

const CACHE_NAME = 'pra-frente-shell-v2';

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

  if (request.mode === 'navigate') {
    // network-first: garante que cada carregamento de página pegue o HTML mais
    // recente (e, por consequência, os nomes hasheados dos assets mais recentes)
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets do app shell (mesma origem, nomes hasheados): cache-first com
  // atualização em segundo plano
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
