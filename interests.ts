// interests.ts — everything that decides WHAT SHOWS FIRST (posts, reels, videos, comments, channel suggestions).
// Lives outside App.tsx on purpose: tune the numbers in CFG (or the scoring below) without touching the app.
//
// Idea: the order is random inside a "tier", but the tiers come from the person's interests:
//   exact interest match  >  close (same-family) interest  >  everything else
// A little exploration is mixed in so nobody gets stuck in a bubble (CFG.exploreEvery).

export const CFG = {
  hobbyWeight: 3,        // interests picked at sign-up (never fade)
  vibeWeight: 1,         // the "mood" picked at sign-up
  minWeight: 0.3,        // ignore interests that faded below this
  interestHalfLifeDays: 3,
  affinityHalfLifeDays: 7,
  relatedFactor: 0.5,    // a CLOSE interest (same family) counts this much of an exact one
  maxMatch: 12,          // cap on the interest points of one item
  matchScale: 10,        // interest points -> score. Bigger = interest beats randomness more
  affinityScale: 3,      // people you engage with
  randomScale: 0.05,     // how much the incoming (random) position matters. Small = only a tie-breaker
  sameLanguage: 6,
  otherLanguage: -4,
  shieldPenalty: -80,
  exploreEvery: 6,       // every Nth slot is an item OUTSIDE the person's interests (0 = never)
  channelSuggestions: 12,
};

type Stamp = { w: number; t: number };
export type InterestMap = Record<string, Stamp>;

// ---------- what the person likes: stored per account on this device ----------
const interestKey = (uid: string) => `kan_interests_${uid}`;
const interestTokens = (text: string) => Array.from(new Set(text.toLowerCase().split(/[\s,.;:!?()"'#،؟]+/).filter(w => w.length >= 3))).slice(0, 6);
export function readInterests(uid: string): InterestMap {
  try { const r = JSON.parse(localStorage.getItem(interestKey(uid)) ?? '{}'); return r && typeof r === 'object' ? (r as InterestMap) : {}; } catch { return {}; }
}
// Called when the person searches / likes / comments: the words of that thing become (fading) interests.
export function bumpInterests(uid: string, text: string, amount = 2) {
  const now = Date.now();
  const cur = readInterests(uid);
  for (const k of interestTokens(text)) {
    const old = cur[k];
    const decayed = old ? old.w * Math.pow(0.5, (now - old.t) / (CFG.interestHalfLifeDays * 864e5)) : 0;
    cur[k] = { w: Math.min(decayed + amount, 20), t: now };
  }
  const top = Object.entries(cur).sort((a, b) => b[1].w - a[1].w).slice(0, 60);
  try { localStorage.setItem(interestKey(uid), JSON.stringify(Object.fromEntries(top))); } catch { /* ignore */ }
}
const hobbyKey = (uid: string) => `kan_hobbies_${uid}`;
export function readHobbies(uid: string): string[] {
  try { const r = JSON.parse(localStorage.getItem(hobbyKey(uid)) ?? 'null') as { kw?: string[] } | null; return Array.isArray(r?.kw) ? r!.kw!.filter(k => typeof k === 'string') : []; } catch { return []; }
}
export function saveHobbies(uid: string, ids: string[], kw: string[]) {
  try { localStorage.setItem(hobbyKey(uid), JSON.stringify({ ids, kw: Array.from(new Set(kw.map(k => k.toLowerCase().trim()).filter(k => k.length >= 2))) })); } catch { /* ignore */ }
}
// Who the person really engages with (likes, comments, replies): a slow-fading weight per author.
const affKey = (uid: string) => `kan_aff_${uid}`;
export function readAffinity(uid: string): Record<string, Stamp> {
  try { const r = JSON.parse(localStorage.getItem(affKey(uid)) ?? '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; }
}
export function bumpAffinity(uid: string, authorId: string, amount = 2) {
  if (!authorId || authorId === uid) return;
  const now = Date.now();
  const cur = readAffinity(uid);
  const old = cur[authorId];
  const decayed = old ? old.w * Math.pow(0.5, (now - old.t) / (CFG.affinityHalfLifeDays * 864e5)) : 0;
  cur[authorId] = { w: Math.min(decayed + amount, 15), t: now };
  const top = Object.entries(cur).sort((a, b) => b[1].w - a[1].w).slice(0, 80);
  try { localStorage.setItem(affKey(uid), JSON.stringify(Object.fromEntries(top))); } catch { /* ignore */ }
}

// ---------- scoring ----------
export type Rankable = { id?: string; text: string; title?: string; media?: { name?: string }; userId?: string };
// What the app knows that this file does not: the families of related words, the mood, the language.
export type RankEnv = {
  groups: string[][];      // families of close words (football: كورة / ميسي / الأهلي ...)
  vibeKw: string[];        // keywords of the mood(s) the person picked
  shield: boolean;         // the person asked to be protected from upsetting posts
  distress: RegExp;
  arabicUser: boolean;
};
const arCount = (s: string) => (s.match(/[\u0600-\u06FF]/g) || []).length;
const laCount = (s: string) => (s.match(/[A-Za-z]/g) || []).length;

// word -> weight: exact interests, then their close family at a lower weight.
export function interestProfile(uid: string, env: RankEnv): Map<string, number> {
  const hour = Math.floor(Date.now() / 36e5) * 36e5;
  const exact = new Map<string, number>();
  const add = (k: string, w: number) => { k = k.toLowerCase().trim(); if (k.length >= 2) exact.set(k, (exact.get(k) ?? 0) + w); };
  for (const k of readHobbies(uid)) add(k, CFG.hobbyWeight);
  for (const k of env.vibeKw) add(k, CFG.vibeWeight);
  for (const [k, v] of Object.entries(readInterests(uid))) add(k, v.w * Math.pow(0.5, (hour - v.t) / (CFG.interestHalfLifeDays * 864e5)));
  const out = new Map(Array.from(exact).filter(([, w]) => w >= CFG.minWeight));
  // Close interests: if you like one word of a family, the rest of that family is near your taste too.
  for (const g of env.groups) {
    const gl = g.map(x => x.toLowerCase());
    let top = 0;
    for (const k of gl) top = Math.max(top, exact.get(k) ?? 0);
    if (top < CFG.minWeight) continue;
    for (const k of gl) if (!out.has(k)) out.set(k, top * CFG.relatedFactor);
  }
  return out;
}

// Interest points of one text (each word counted once).
export function matchPoints(hay: string, profile: Map<string, number>): number {
  let b = 0;
  for (const [k, w] of profile) if (hay.includes(k)) b += w;
  return Math.min(b, CFG.maxMatch);
}

// `list` comes in already in its random (or newest-first) order; that order only breaks ties.
export function rankItems<T extends Rankable>(list: T[], uid: string, env: RankEnv): T[] {
  const profile = interestProfile(uid, env);
  const aff = readAffinity(uid);
  if (profile.size === 0 && Object.keys(aff).length === 0 && !env.shield) return list;
  const hour = Math.floor(Date.now() / 36e5) * 36e5;
  const scored = list.map((p, i) => {
    const hay = `${p.text} ${p.title ?? ''} ${p.media?.name ?? ''}`.toLowerCase();
    const b = matchPoints(hay, profile);
    let sc = -i * CFG.randomScale + b * CFG.matchScale;
    const a = p.userId ? aff[p.userId] : undefined;
    if (a) sc += Math.min(a.w * Math.pow(0.5, (hour - a.t) / (CFG.affinityHalfLifeDays * 864e5)), 10) * CFG.affinityScale;
    const ar = arCount(hay), la = laCount(hay);
    if (ar + la >= 4) sc += (ar > la) === env.arabicUser ? CFG.sameLanguage : CFG.otherLanguage;
    const upset = env.shield && env.distress.test(hay);
    if (upset) sc += CFG.shieldPenalty;
    return { p, s: sc, b, upset, a: a ? 1 : 0 };
  }).sort((x, y) => y.s - x.s);

  // A little exploration: every Nth slot is something outside the person's interests.
  const inTaste = scored.filter(x => !x.upset && (x.b > 0 || x.a));
  const outside = scored.filter(x => !x.upset && !(x.b > 0 || x.a));
  const upsetList = scored.filter(x => x.upset);
  const mixed: typeof scored = [];
  const n = CFG.exploreEvery;
  while (inTaste.length || outside.length) {
    const slot = mixed.length + 1;
    const wantOutside = n > 0 && slot % n === 0;
    const next = (wantOutside ? outside.shift() ?? inTaste.shift() : inTaste.shift() ?? outside.shift());
    if (next) mixed.push(next);
  }
  mixed.push(...upsetList);

  // Variety: never the same author twice in a row when someone else is close by.
  const out: T[] = [];
  const rest = mixed.map(x => x.p);
  while (rest.length) {
    const last = out[out.length - 1]?.userId;
    let k = 0;
    if (last && rest[0].userId === last) { const f = rest.findIndex((x, idx) => idx < 6 && x.userId !== last); if (f > 0) k = f; }
    out.push(rest.splice(k, 1)[0]);
  }
  return out;
}

// Channels to suggest in the Videos tab: accounts whose videos match the person's taste first, then the rest.
export function rankChannels<U extends { id: string }>(users: U[], textsOf: (id: string) => string, uid: string, env: RankEnv): U[] {
  const profile = interestProfile(uid, env);
  const aff = readAffinity(uid);
  return users
    .map((u, i) => ({ u, s: matchPoints(textsOf(u.id).toLowerCase(), profile) * CFG.matchScale + (aff[u.id]?.w ?? 0) * CFG.affinityScale - i * CFG.randomScale }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.u);
}
