const CACHE_VERSION = "dawahx-app-v1";
const CACHE_PREFIX = "dawahx-app-";

const PRECACHE = [
  "./",
  "./index.html",
  "./about.html",
  "./services.html",
  "./questions.html",
  "./fatwa.html",
  "./videos.html",
  "./ask.html",
  "./contact.html",
  "./offline.html",
  "./assets/873538a7f4.css",
  "./assets/4a4032d683.js",
  "./assets/153d46abe6.js",
  "./app/app.css",
  "./app/app.js",
  "./site.webmanifest",
  "./favicon.svg",
  "./img/994f114bee.webp",
  "./img/e21bda05e5.webp",
  "./img/db1cf75613.png",
  "./img/3c3b403dc7.png",
  "./img/4a77b85c06.png",
  "./img/887065ba37.webp",
  "./img/53bda37a05.jpg",
  "./app/icon-maskable-192.png",
  "./app/icon-maskable-512.png"
];

const OFFLINE_URL = "./offline.html";
const SKIP_CACHE = /\/(fatwa|questions)-catalog-part-\d+\.js$|\/youtube-videos\.json$/;

const toAbsolute = (path) => new URL(path, self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await Promise.allSettled(
        PRECACHE.map((path) =>
          cache.add(new Request(toAbsolute(path), { cache: "reload" }))
        )
      );
      if (!self.registration.active) await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

const isShellRequest = (url) =>
  url.pathname.endsWith("/") ||
  url.pathname.endsWith(".html") ||
  url.pathname.endsWith("/app/app.css") ||
  url.pathname.endsWith("/app/app.js") ||
  url.pathname.endsWith("/site.webmanifest") ||
  url.pathname.endsWith("/sw.js");

const networkFirst = async (request) => {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await cache.match(toAbsolute(OFFLINE_URL));
    if (offline) return offline;
    return new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>অফলাইন</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#08151a;color:#eef2f8;font-family:system-ui,sans-serif;text-align:center;padding:24px"><div><p style="color:#f5b81c;letter-spacing:2px;font-size:12px;font-weight:700">DAWAH X</p><h1 style="font-size:22px;margin:8px 0">আপনি অফলাইনে আছেন</h1><p style="color:#a7b3c7;font-size:14px">ইন্টারনেট সংযোগ ফিরে এলে আবার চেষ্টা করুন।</p></div></body>',
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const fresh = await network;
  if (fresh) return fresh;
  return new Response("", { status: 504, statusText: "Offline" });
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (SKIP_CACHE.test(url.pathname)) return;
  if (request.headers.has("range")) return;

  if (request.mode === "navigate" || isShellRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
