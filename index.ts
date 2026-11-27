// @ts-nocheck
// supabase/functions/force-push/index.ts  (server only, NOT part of the app bundle)
//
// Sends a HIGH-priority, heads-up ("drop-down") notification through Google FCM (HTTP v1) to every device of the
// given users, even when the app is closed: Android (max-importance channel), iOS (time-sensitive, priority 10),
// and browsers / PWAs (Urgency: high). People who only have a classic Web Push subscription get it through the
// existing `push` function, so nobody is skipped.
//
// POST  header: x-webhook-secret: <app_secrets.push_webhook_secret>
//   { "recipient_ids": ["<uuid>", ...], "title": "...", "body": "...", "tag": "...",
//     "icon_user": "<uuid>", "kind": "message" | "call", "url": "/?kan_call=...", "data": { ... } }
//
// Setup (once): put the Firebase service-account JSON in the Edge Function secret FCM_SERVICE_ACCOUNT
// (or in app_secrets with name 'fcm_service_account').
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function secret(name: string, env: string): Promise<string | undefined> {
  const e = Deno.env.get(env);
  if (e) return e;
  const { data } = await admin.from('app_secrets').select('value').eq('name', name).maybeSingle();
  return (data?.value as string | undefined) || undefined;
}

// ---- Google OAuth access token from the service account (RS256 JWT, cached while valid) ----
const b64u = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = '';
  for (const x of u) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const enc = new TextEncoder();
let tokenCache: { t: string; exp: number } | null = null;
async function accessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.t;
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = b64u(enc.encode(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${head}.${claim}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${b64u(sig)}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('google auth failed: ' + JSON.stringify(j));
  tokenCache = { t: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

type Msg = { title: string; body: string; tag: string; icon?: string; kind: 'message' | 'call'; url?: string; data: Record<string, string> };

// One FCM message that is "loud" on every platform.
function fcmMessage(token: string, m: Msg) {
  const call = m.kind === 'call';
  return {
    message: {
      token,
      // `notification` makes Android/iOS draw it by themselves even if the app (or its service worker) is dead.
      notification: { title: m.title, body: m.body },
      data: { ...m.data, title: m.title, body: m.body, tag: m.tag, kind: m.kind, url: m.url ?? '/' },
      android: {
        priority: 'HIGH', // wakes the phone from Doze
        ttl: call ? '45s' : '86400s',
        collapse_key: m.tag,
        notification: {
          channel_id: call ? 'kix_calls' : 'kix_heads_up', // create these two channels with IMPORTANCE_HIGH/MAX in the app
          notification_priority: 'PRIORITY_MAX',
          default_sound: true,
          default_vibrate_timings: true,
          default_light_settings: true,
          visibility: 'PUBLIC',
          tag: m.tag,
          sticky: call,
          ...(m.icon ? { image: m.icon } : {}),
        },
      },
      apns: {
        headers: { 'apns-priority': '10', 'apns-push-type': 'alert', 'apns-expiration': String(Math.floor(Date.now() / 1000) + (call ? 45 : 86400)), 'apns-collapse-id': m.tag.slice(0, 64) },
        payload: { aps: { alert: { title: m.title, body: m.body }, sound: 'default', 'interruption-level': call ? 'time-sensitive' : 'active', 'mutable-content': 1, 'thread-id': m.tag } },
      },
      webpush: {
        headers: { Urgency: 'high', TTL: call ? '45' : '86400' },
        notification: { title: m.title, body: m.body, tag: m.tag, renotify: true, requireInteraction: call, vibrate: [200, 100, 200], silent: false, ...(m.icon ? { icon: m.icon } : {}) },
        fcm_options: { link: m.url ?? '/' },
      },
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const expected = await secret('push_webhook_secret', 'PUSH_WEBHOOK_SECRET');
  if (!expected || req.headers.get('x-webhook-secret') !== expected) return json({ error: 'unauthorized' }, 401);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ error: 'invalid_request' }, 400); }
  const ids = Array.isArray(b.recipient_ids) ? b.recipient_ids.filter((x): x is string => typeof x === 'string' && UUID.test(x)).slice(0, 200) : [];
  if (ids.length === 0) return json({ sent: 0 });
  const str = (v: unknown, n: number, d = '') => (typeof v === 'string' && v ? v.slice(0, n) : d);
  const kind = b.kind === 'call' ? 'call' : 'message';
  const m: Msg = {
    title: str(b.title, 80, 'KIX'),
    body: str(b.body, 160),
    tag: str(b.tag, 80, 'kix-notification'),
    icon: typeof b.icon_user === 'string' && UUID.test(b.icon_user) ? `${supabaseUrl}/functions/v1/push?avatar=${b.icon_user}` : undefined,
    kind,
    url: typeof b.url === 'string' && b.url.startsWith('/') ? b.url.slice(0, 300) : undefined,
    data: Object.fromEntries(Object.entries((b.data as Record<string, unknown>) ?? {}).slice(0, 20).map(([k, v]) => [k, String(v).slice(0, 500)])),
  };

  let fcmSent = 0, removed = 0;
  const saRaw = await secret('fcm_service_account', 'FCM_SERVICE_ACCOUNT');
  if (saRaw) {
    try {
      const sa = JSON.parse(saRaw);
      const { data: toks } = await admin.from('fcm_tokens').select('id, token').in('user_id', ids);
      if (toks?.length) {
        const at = await accessToken(sa);
        const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
        const res = await Promise.allSettled(toks.map(async (t) => {
          const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' }, body: JSON.stringify(fcmMessage(t.token, m)) });
          if (r.ok) return 'ok';
          const e = await r.json().catch(() => ({}));
          const code = JSON.stringify(e);
          if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT.*token/i.test(code)) return 'gone';
          console.error('fcm rejected', r.status, code.slice(0, 300));
          return 'fail';
        }));
        const gone: string[] = [];
        res.forEach((r, i) => { if (r.status === 'fulfilled') { if (r.value === 'ok') fcmSent++; else if (r.value === 'gone') gone.push(toks[i].id); } });
        if (gone.length) { await admin.from('fcm_tokens').delete().in('id', gone); removed = gone.length; }
      }
    } catch (e) { console.error('fcm error', String(e)); }
  }

  // Classic Web Push subscriptions (and everyone without an FCM token) still get it through the existing `push` function.
  let webSent = 0;
  try {
    const r = await fetch(`${supabaseUrl}/functions/v1/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': expected },
      body: JSON.stringify({ notification: { recipient_ids: ids, title: m.title, body: m.body, tag: m.tag, icon_user: b.icon_user } }),
    });
    webSent = ((await r.json().catch(() => ({}))) as { sent?: number }).sent ?? 0;
  } catch (e) { console.error('web push fallback error', String(e)); }

  return json({ fcm: fcmSent, web: webSent, removed });
});
