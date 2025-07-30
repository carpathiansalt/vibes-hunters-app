const CACHE_NAME = 'vibes-hunters-v1';
const STATIC_CACHE_NAME = 'vibes-hunters-static-v1';
const API_CACHE_NAME = 'vibes-hunters-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/map',
  '/prejoin',
  '/dashboard',
  '/music_gendre/ambient.png',
  '/music_gendre/rock.png',
  '/music_gendre/pop.png',
  '/music_gendre/blues.png',
  '/music_gendre/classical.png',
  '/music_gendre/disco.png',
  '/music_gendre/folk.png',
  '/music_gendre/funk.png',
  '/music_gendre/hip-hop.png',
  '/music_gendre/jazz.png',
  '/music_gendre/punk.png',
  '/music_gendre/raggae.png',
  '/music_gendre/soul.png',
  '/music_gendre/techno.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip requests to different origins (except Google Maps)
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('googleapis.com') &&
      !url.hostname.includes('maps.gstatic.com')) {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME)
        .then((cache) => {
          return fetch(request)
            .then((response) => {
              // Only cache successful responses
              if (response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // Return cached version if network fails
              return cache.match(request);
            });
        })
    );
    return;
  }

  // Static assets - cache first, network fallback
  if (url.pathname.includes('.png') || 
      url.pathname.includes('.jpg') || 
      url.pathname.includes('.jpeg') ||
      url.pathname.includes('.webp') ||
      url.pathname.includes('.svg') ||
      url.pathname.includes('.css') ||
      url.pathname.includes('.js')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              // Cache the fetched resource
              if (response.status === 200) {
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => cache.put(request, response.clone()));
              }
              return response;
            });
        })
    );
    return;
  }

  // Google Maps resources - cache first
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('maps.gstatic.com')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => cache.put(request, response.clone()));
              }
              return response;
            });
        })
    );
    return;
  }

  // HTML pages - network first, cache fallback
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.status === 200) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request);
        })
    );
    return;
  }
});

// Background sync for better offline experience
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('Background sync triggered')
    );
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/android-chrome-192x192.png',
        badge: '/android-chrome-192x192.png',
        tag: 'vibes-hunters',
      })
    );
  }
});