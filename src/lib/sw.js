// KAN service worker: shows chat notifications when the app is closed or in the background.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
      await self.registration.showNotification(data.title || 'KAN', {
        body: data.body || '',
        tag: data.tag || 'kan-message',
        renotify: true,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        dir: 'rtl',
        lang: 'ar',
        data: { url: self.registration.scope },
      });
    })()
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

// Needed for the browser to offer "install". Pages always come from the network;
// if the device is offline, show a short message instead of the browser's error page.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body dir="rtl" style="font-family:sans-serif;background:#030712;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p>لا يوجد اتصال بالإنترنت. حاول مرة أخرى.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    )
  );
});
