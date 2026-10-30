// Service Worker - PereiraLabs Foods PWA
// Versão do Cache sincronizada com o Build OTA v3.5.0
const APP_VERSION = "3.5.0";
const CACHE_NAME = `pereiralabs-pwa-v${APP_VERSION.replace(/\./g, "-")}-build-2026102906`;

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./version.json",
  "./manifest.webmanifest",
  "./icon.svg",
  "./pwa-192x192.png",
  "./pwa-512x512.png",
  "./apple-touch-icon.png",
];

// Instalação: baixa os assets essenciais e força a ativação imediata (skipWaiting)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] Erro no precache:", err))
  );
});

// Ativação: apaga IMEDIATAMENTE todos os caches de versões antigas e assume o controle dos clientes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("[SW] Removendo cache obsoleto:", key);
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Escuta mensagem da aplicação para forçar atualização OTA
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Recebida ordem para ativar nova versão (SKIP_WAITING)");
    self.skipWaiting();
  }
});

// Estratégia de Fetch:
// 1. Requisições HTML de navegação: NETWORK-FIRST com cache: 'no-cache'
//    Isso garante que ao abrir o app online no Android/iOS, ele sempre carrega a versão mais recente!
// 2. Requisições para Supabase: BYPASS total (sempre direto à rede)
// 3. Demais assets (JS/CSS versionados pelo Vite): Network com fallback para Cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bypass completo de chamadas de API do Supabase e webhooks
  if (url.hostname.includes("supabase.co") || url.pathname.includes("/rest/v1/")) {
    return;
  }

  // 1. Navegação (HTML principal): SEMPRE busca da rede primeiro para detectar novos deploys OTA
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-cache" })
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", clone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 2. Consulta ao version.json: SEMPRE da rede para checagem precisa de OTA
  if (url.pathname.endsWith("version.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => caches.match("./version.json"))
    );
    return;
  }

  // 3. Assets estáticos (JS, CSS, imagens): Network com cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          (url.origin === self.location.origin ||
            url.hostname.includes("fonts.googleapis.com") ||
            url.hostname.includes("fonts.gstatic.com"))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
