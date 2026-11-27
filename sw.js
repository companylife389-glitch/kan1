// KIX service worker: shows chat notifications when the app is closed or in the background.
const STATIC_CACHE = 'kix-static-v1'; // the app's own built files (their names change with every update)
const IMG_CACHE = 'kix-img-v1'; // sticker / emoji pictures from the CDN
const KEEP = [STATIC_CACHE, IMG_CACHE];
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)));
  await self.clients.claim();
})()));

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => c.delete(k)));
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // The app is open and in front: it plays its own sound, so no system notification.
      if (windows.some((w) => w.visibilityState === 'visible' && w.focused)) return;
      // Show it at once with the app icon: nothing may wait for a network request.
      const show = (icon, quiet) => self.registration.showNotification(data.title || 'KIX', {
        body: data.body || '',
        tag: data.tag || 'kan-message',
        renotify: !quiet,
        silent: !!quiet,
        vibrate: quiet ? undefined : [200, 100, 200],
        timestamp: Date.now(),
        icon,
        badge: 'badge-96.png',
        dir: 'rtl',
        lang: 'ar',
        data: { url: data.url || self.registration.scope },
      });
      await show('icon-192.png', false);
      // Then swap in the sender's picture quietly if it loads fast (same tag, no second sound).
      if (data.icon) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2500);
          const res = await fetch(data.icon, { signal: ctrl.signal });
          clearTimeout(timer);
          if (res.ok) await show(data.icon, true);
        } catch (e) { /* keep the app icon */ }
      }
    })()
  );
});

// If the browser renews the push subscription, tell the open app so it saves the new one.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => ws.forEach((w) => w.postMessage({ kan: 'resubscribe' })))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if ('focus' in w) {
          await w.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});

// Fast loading: built files and sticker pictures come from the phone after the first time; the page itself still
// comes from the network (so updates arrive), but on a slow connection it falls back to the saved copy after 3.5 s.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    const shellKey = url.origin + url.pathname;
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(req, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok && res.type === 'basic') cache.put(shellKey, res.clone());
        return res;
      } catch (e) {
        const saved = await cache.match(shellKey);
        if (saved) return saved;
        return new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body dir="rtl" style="font-family:sans-serif;background:#030712;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p>لا يوجد اتصال بالإنترنت. حاول مرة أخرى.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // The app's built files: the name carries a hash, so a saved copy is always the right one.
  if (url.origin === self.location.origin && url.pathname.includes('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // Sticker / emoji pictures: saved after the first load, so they open and send instantly next time.
  if (url.hostname === 'fonts.gstatic.com' && url.pathname.startsWith('/s/e/notoemoji/')) {
    event.respondWith((async () => {
      const cache = await caches.open(IMG_CACHE);
      const hit = await cache.match(url.href);
      if (hit) return hit;
      try {
        const res = await fetch(url.href, { mode: 'cors', credentials: 'omit' });
        if (res.ok) { cache.put(url.href, res.clone()); trim(IMG_CACHE, 400); }
        return res;
      } catch (e) {
        return fetch(req);
      }
    })());
  }
});
