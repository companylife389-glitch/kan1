// KIX service worker: shows chat notifications when the app is closed or in the background.
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
