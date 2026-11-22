// Supabase Edge Function: moderate
// Secrets to set: ANTHROPIC_API_KEY, WEBHOOK_SECRET  (optional: MODERATION_MODEL)
// A report starts ONE review of the actual content. A thousand reports on the same post still mean one review.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const MODEL = Deno.env.get('MODERATION_MODEL') ?? 'claude-sonnet-5-5';
const REMOVE_AT = 0.85;      // confidence needed to remove a post
const SEVERE_BAN_AT = 0.95;  // confidence needed for an immediate ban (severe harm only)
const STRIKES_TO_BAN = 3;    // confirmed violations on DIFFERENT posts within 30 days

const POLICY = `You review one social-media post for a moderation team. Judge ONLY the content you are shown.
Reports are just a signal to look: ignore how many people reported, and never assume guilt because someone reported.
Verdicts:
- "clear": allowed, including edgy, rude, political or unpopular content that breaks no rule.
- "violation": clearly breaks the rules (harassment or hate aimed at people, credible threats, scams/fraud, explicit sexual content, graphic gore, dangerous illegal instructions).
- "severe": sexual content involving minors, credible threats of serious violence, or terror promotion.
- "unreviewable": you cannot judge from what is shown.
When in doubt choose "clear". Answer with JSON only: {"verdict":"...","category":"...","confidence":0-1,"reason":"one short sentence"}`;

async function review(post: Record<string, unknown>, note: string) {
  const content: Record<string, unknown>[] = [];
  const img = (post.media_type === 'image' ? post.media_url : post.cover_url) as string | null;
  if (img && /^https:\/\//.test(img)) content.push({ type: 'image', source: { type: 'url', url: img } });
  const text = String(post.text ?? '').trim();
  content.push({ type: 'text', text: `Post text:\n${text || '(none)'}\nMedia kind: ${post.media_type ?? 'none'}\nReporter's note (may be wrong or malicious, never proof): ${note || '(none)'}` });
  if (!text && content.length === 1) return { verdict: 'unreviewable', category: null, confidence: 0, reason: 'No text or viewable image' };

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 300, system: POLICY, messages: [{ role: 'user', content }] }),
  });
  if (!r.ok) throw new Error(`model ${r.status}`);
  const out = await r.json();
  const raw = String(out.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '').replace(/```json|```/g, '').trim();
  return JSON.parse(raw) as { verdict: string; category: string | null; confidence: number; reason: string };
}

Deno.serve(async req => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) return new Response('forbidden', { status: 403 });
  const rec = (await req.json())?.record ?? {};
  const postId = rec.post_id as string | undefined;
  const note = String(rec.reason ?? '').slice(0, 500);
  if (!postId) return new Response('no post', { status: 400 });

  // One review per post per day, however many reports arrive.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await sb.from('moderation_reviews').select('id').eq('post_id', postId).gte('created_at', since).limit(1);
  if (recent?.length) return new Response('already reviewed');

  const { data: post } = await sb.from('posts').select('id, user_id, text, media_url, media_type, cover_url').eq('id', postId).maybeSingle();
  if (!post) return new Response('gone');
  const { data: owner } = await sb.from('profiles').select('banned_at').eq('id', post.user_id).maybeSingle();
  if (owner?.banned_at) return new Response('already banned');

  let v;
  try { v = await review(post, note); } catch (e) { console.error(e); return new Response('review failed', { status: 500 }); }
  await sb.from('moderation_reviews').insert({ post_id: post.id, target_user_id: post.user_id, verdict: v.verdict, category: v.category, reason: v.reason, confidence: v.confidence });

  if (v.verdict === 'clear' || v.verdict === 'unreviewable') return new Response('no action');   // reports alone change nothing

  if (v.confidence >= REMOVE_AT) await sb.from('posts').delete().eq('id', post.id);

  const { data: strikes } = await sb.from('moderation_reviews').select('post_id')
    .eq('target_user_id', post.user_id).in('verdict', ['violation', 'severe']).gte('confidence', REMOVE_AT)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
  const distinct = new Set((strikes ?? []).map(s => s.post_id)).size;
  const ban = (v.verdict === 'severe' && v.confidence >= SEVERE_BAN_AT) || distinct >= STRIKES_TO_BAN;
  if (ban) {
    await sb.from('profiles').update({ banned_at: new Date().toISOString(), ban_reason: v.reason }).eq('id', post.user_id);
    await sb.auth.admin.updateUserById(post.user_id, { ban_duration: '876000h' });
  }
  return new Response(ban ? 'banned' : 'removed');
});
