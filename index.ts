// @ts-nocheck
// Deno Edge Function: not part of the web app build.
// supabase/functions/livekit-token/index.ts
// Deploy:  supabase functions deploy livekit-token
// Secrets: supabase secrets set LIVEKIT_URL=wss://kix-0bizrf5u.livekit.cloud LIVEKIT_API_KEY=<your key> LIVEKIT_API_SECRET=<your secret>
import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { room } = await req.json();
    if (typeof room !== 'string' || !/^call-[0-9a-f-]{36}$/.test(room)) return json({ error: 'bad room' }, 400);

    const at = new AccessToken(Deno.env.get('LIVEKIT_API_KEY')!, Deno.env.get('LIVEKIT_API_SECRET')!, { identity: user.id, ttl: '1h' });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
    return json({ token: await at.toJwt(), url: Deno.env.get('LIVEKIT_URL') });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
