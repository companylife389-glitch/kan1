-- Run once in Supabase → SQL Editor. Safe to re-run.
-- 1) Account type + who can message me
alter table public.profiles add column if not exists is_private boolean not null default false;
alter table public.profiles add column if not exists who_can_message text not null default 'everyone';
do $$ begin
  alter table public.profiles add constraint profiles_who_can_message_chk check (who_can_message in ('everyone','followers','nobody'));
exception when duplicate_object then null; end $$;

-- 2) Blocks
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists blocks_select on public.blocks;
drop policy if exists blocks_insert on public.blocks;
drop policy if exists blocks_delete on public.blocks;
create policy blocks_select on public.blocks for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);
create policy blocks_insert on public.blocks for insert with check (auth.uid() = blocker_id);
create policy blocks_delete on public.blocks for delete using (auth.uid() = blocker_id);

-- 3) Follow requests (private accounts)
create table if not exists public.follow_requests (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (requester_id, target_id)
);
alter table public.follow_requests enable row level security;
drop policy if exists fr_select on public.follow_requests;
drop policy if exists fr_insert on public.follow_requests;
drop policy if exists fr_delete on public.follow_requests;
create policy fr_select on public.follow_requests for select using (auth.uid() = requester_id or auth.uid() = target_id);
create policy fr_insert on public.follow_requests for insert with check (auth.uid() = requester_id);
create policy fr_delete on public.follow_requests for delete using (auth.uid() = requester_id or auth.uid() = target_id);

create or replace function public.accept_follow_request(p_requester uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from follow_requests where requester_id = p_requester and target_id = auth.uid()) then
    raise exception 'no such request';
  end if;
  insert into follows (follower_id, following_id) values (p_requester, auth.uid()) on conflict do nothing;
  delete from follow_requests where requester_id = p_requester and target_id = auth.uid();
end $$;
grant execute on function public.accept_follow_request(uuid) to authenticated;

-- 4) Server-side guard: blocked / closed inboxes can't receive messages (even from a modified client)
create or replace function public.guard_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; other uuid; pol text;
begin
  select user_a, user_b into a, b from conversations where id = new.conversation_id;
  other := case when a = new.sender_id then b else a end;
  if exists (select 1 from blocks where (blocker_id = other and blocked_id = new.sender_id) or (blocker_id = new.sender_id and blocked_id = other)) then
    raise exception 'blocked';
  end if;
  select who_can_message into pol from profiles where id = other;
  if pol = 'nobody' then raise exception 'messages_closed'; end if;
  if pol = 'followers' and not exists (select 1 from follows where follower_id = other and following_id = new.sender_id) then
    raise exception 'messages_closed';
  end if;
  return new;
end $$;
drop trigger if exists messages_guard on public.messages;
create trigger messages_guard before insert on public.messages for each row execute function public.guard_message();
