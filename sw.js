const CACHE_NAME = 'basujindal-v1';
const STATIC_CACHE = 'static-v1';
const CDN_CACHE = 'cdn-v1';
const BLOG_CACHE = 'blog-v1';

// Core static assets to pre-cache on install
const PRECACHE_URLS = [
  '/css/main.css',
  '/js/config.js',
  '/js/components.js',
  '/js/main.js',
  '/js/post.js',
  '/js/blog-list.js',
];

// Install - pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE, CDN_CACHE, BLOG_CACHE];
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => !currentCaches.includes(name)).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls
  if (url.hostname === 'server.basujindal.me') return;

  // CDN resources (jsdelivr, unpkg) - cache-first
  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
    return;
  }

  // Blog markdown files - stale-while-revalidate
  if (url.pathname.match(/\/(blog-posts|drafts)\/.*\.md$/)) {
    event.respondWith(staleWhileRevalidate(request, BLOG_CACHE));
    return;
  }

  // Static assets (CSS, JS, images, WebP) - stale-while-revalidate
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // HTML pages - network-first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }
});

// Cache-first: serve from cache, fall back to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// Stale-while-revalidate: serve cached, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// Network-first: try network, fall back to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}
