-- KAN moderation: a report only asks for a review. The NUMBER of reports never bans anyone.
-- Assumes public.posts(id uuid, user_id uuid, ...) and public.profiles(id uuid = auth user id).

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)            -- one report per person per post
);

create table if not exists public.moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid,
  target_user_id uuid not null,
  verdict text not null check (verdict in ('clear', 'violation', 'severe', 'unreviewable')),
  category text,
  reason text,
  confidence numeric,
  created_at timestamptz not null default now()
);
create index if not exists moderation_reviews_user_idx on public.moderation_reviews (target_user_id, created_at desc);
create index if not exists moderation_reviews_post_idx on public.moderation_reviews (post_id, created_at desc);

alter table public.profiles
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

alter table public.reports enable row level security;
alter table public.moderation_reviews enable row level security;   -- no policies: only the service role reads/writes

drop policy if exists "report as myself" on public.reports;
create policy "report as myself" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and not exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));

-- Then in the Supabase dashboard: Database > Webhooks > new webhook on table `reports`, event INSERT,
-- type "Supabase Edge Functions" -> function `moderate`, add header  x-webhook-secret: <same value as WEBHOOK_SECRET>.
