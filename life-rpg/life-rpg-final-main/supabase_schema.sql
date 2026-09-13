-- =========================================================
-- Life RPG – Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the DB
-- =========================================================

-- ── Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid references auth.users on delete cascade primary key,
  full_name      text,
  avatar_url     text,
  xp             integer default 0,
  gold           integer default 0,
  preferences    jsonb   default '{}',
  equipped_item  text    default null,
  created_at     timestamptz default now()
);

-- Migrate existing profiles table if it already exists (add missing columns)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='xp') then
    alter table public.profiles add column xp integer default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='gold') then
    alter table public.profiles add column gold integer default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='preferences') then
    alter table public.profiles add column preferences jsonb default '{}';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='equipped_item') then
    alter table public.profiles add column equipped_item text default null;
  end if;
end $$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Habits ───────────────────────────────────────────────
create table if not exists public.habits (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  name          text not null,
  icon          text default '💧',
  description   text,
  frequency     text default 'daily' check (frequency in ('daily','weekly','monthly')),
  reminder_time time,
  color         text default '#00d4c8',
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ── Habit Logs ────────────────────────────────────────────
create table if not exists public.habit_logs (
  id           uuid default gen_random_uuid() primary key,
  habit_id     uuid references public.habits on delete cascade not null,
  user_id      uuid references auth.users on delete cascade not null,
  completed_at date default current_date not null,
  notes        text,
  created_at   timestamptz default now(),
  unique (habit_id, completed_at)
);

-- ── Shop Items ────────────────────────────────────────────
-- Drop and recreate so the id column is always `text` (slug-friendly).
-- owned_items depends on shop_items, so drop it first (recreated below).
drop table if exists public.owned_items;
drop table if exists public.shop_items;

create table public.shop_items (
  id           text primary key,
  name         text not null,
  description  text,
  icon         text default '🎁',
  type         text default 'badge' check (type in ('badge','theme','title','frame')),
  cost         integer default 50,
  accent_color text default null,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

-- Seed default shop items
insert into public.shop_items (id, name, description, icon, type, cost, accent_color, sort_order)
values
  ('item_golden_anchor',    'Golden Anchor Badge',   'A prestigious badge for the dedicated ocean explorer.',       '⚓', 'badge',  50,  null,      1),
  ('item_deep_sea_theme',   'Deep Sea Theme',         'Transforms your accent color to an abyssal indigo hue.',     '🌊', 'theme',  100, '#3b5bdb', 2),
  ('item_wave_rider_title', 'Wave Rider Title',       'Show your surf skills with this exclusive profile title.',   '🏄', 'title',  75,  null,      3),
  ('item_pearl_diver_badge','Pearl Diver Badge',      'Only the most dedicated collectors earn the Pearl Diver.',   '🦪', 'badge',  150, null,      4),
  ('item_sunset_theme',     'Sunset Horizon Theme',   'Warm amber and rose accent for a golden hour vibe.',         '🌅', 'theme',  120, '#e67e22', 5),
  ('item_coral_frame',      'Coral Avatar Frame',     'A glowing coral ring surrounds your profile avatar.',        '🪸', 'frame',  80,  null,      6);

-- ── Owned Items ───────────────────────────────────────────
create table public.owned_items (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  item_id      text references public.shop_items(id) on delete cascade not null,
  purchased_at timestamptz default now(),
  unique (user_id, item_id)
);

-- ── Row Level Security ────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.habits      enable row level security;
alter table public.habit_logs  enable row level security;
alter table public.shop_items  enable row level security;
alter table public.owned_items enable row level security;

-- Idempotent policy creation: drop-then-recreate so this script is safe to re-run
do $policies$
begin

  -- ── Profiles ──────────────────────────────────────────
  drop policy if exists "Users can read own profile"   on public.profiles;
  drop policy if exists "Users can update own profile" on public.profiles;
  drop policy if exists "Users can insert own profile" on public.profiles;

  create policy "Users can read own profile"
    on public.profiles for select using (auth.uid() = id);
  create policy "Users can update own profile"
    on public.profiles for update using (auth.uid() = id);
  create policy "Users can insert own profile"
    on public.profiles for insert with check (auth.uid() = id);

  -- ── Habits ────────────────────────────────────────────
  drop policy if exists "Users can read own habits"   on public.habits;
  drop policy if exists "Users can insert own habits" on public.habits;
  drop policy if exists "Users can update own habits" on public.habits;
  drop policy if exists "Users can delete own habits" on public.habits;

  create policy "Users can read own habits"
    on public.habits for select using (auth.uid() = user_id);
  create policy "Users can insert own habits"
    on public.habits for insert with check (auth.uid() = user_id);
  create policy "Users can update own habits"
    on public.habits for update using (auth.uid() = user_id);
  create policy "Users can delete own habits"
    on public.habits for delete using (auth.uid() = user_id);

  -- ── Habit Logs ────────────────────────────────────────
  drop policy if exists "Users can read own logs"   on public.habit_logs;
  drop policy if exists "Users can insert own logs" on public.habit_logs;
  drop policy if exists "Users can delete own logs" on public.habit_logs;

  create policy "Users can read own logs"
    on public.habit_logs for select using (auth.uid() = user_id);
  create policy "Users can insert own logs"
    on public.habit_logs for insert with check (auth.uid() = user_id);
  create policy "Users can delete own logs"
    on public.habit_logs for delete using (auth.uid() = user_id);

  -- ── Shop Items (catalog: any authenticated user can read) ──
  drop policy if exists "Authenticated users can read shop items" on public.shop_items;

  create policy "Authenticated users can read shop items"
    on public.shop_items for select using (auth.role() = 'authenticated');

  -- ── Owned Items ───────────────────────────────────────
  drop policy if exists "Users can read own owned items"   on public.owned_items;
  drop policy if exists "Users can insert own owned items" on public.owned_items;

  create policy "Users can read own owned items"
    on public.owned_items for select using (auth.uid() = user_id);
  create policy "Users can insert own owned items"
    on public.owned_items for insert with check (auth.uid() = user_id);

end
$policies$;


-- ── Stored Functions ──────────────────────────────────────
-- Must DROP before CREATE OR REPLACE when the return type changes.
drop function if exists public.award_xp(integer, text);
drop function if exists public.sync_gold(integer);
drop function if exists public.purchase_item(text);

-- award_xp: add XP to current user and optionally an RPG attribute
create or replace function public.award_xp(p_amount integer, p_attribute text default null)
returns table(new_xp integer, new_level integer)
language plpgsql security definer as $$
declare
  v_uid  uuid := auth.uid();
  v_xp   integer;
  v_attr text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  -- Ensure profile row exists
  insert into public.profiles (id, xp) values (v_uid, 0)
  on conflict (id) do nothing;

  -- Increment XP
  update public.profiles
  set xp = greatest(0, coalesce(xp, 0) + p_amount)
  where id = v_uid
  returning xp into v_xp;

  -- Increment attribute stored inside preferences JSONB
  if p_attribute is not null and p_attribute <> '' then
    v_attr := 'attr_' || p_attribute;
    update public.profiles
    set preferences = jsonb_set(
      coalesce(preferences, '{}'),
      array[v_attr],
      to_jsonb(greatest(0, coalesce((preferences->>v_attr)::integer, 0) + p_amount))
    )
    where id = v_uid;
  end if;

  -- Return new XP + level
  return query select v_xp, (floor(sqrt(v_xp::float / 50)) + 1)::integer;
end;
$$;

-- sync_gold: compute gold from total stars, never decrease existing balance
create or replace function public.sync_gold(p_total_stars integer)
returns integer
language plpgsql security definer as $$
declare
  v_uid  uuid := auth.uid();
  v_gold integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  insert into public.profiles (id, gold) values (v_uid, 0)
  on conflict (id) do nothing;

  -- 1 gold per 10 stars, but never decrease existing gold
  update public.profiles
  set gold = greatest(coalesce(gold, 0), floor(p_total_stars::float / 10)::integer)
  where id = v_uid
  returning gold into v_gold;

  return v_gold;
end;
$$;

-- purchase_item: atomically validate balance, deduct gold, record ownership
create or replace function public.purchase_item(p_item_id text)
returns jsonb
language plpgsql security definer as $$
declare
  v_uid      uuid := auth.uid();
  v_item     public.shop_items%rowtype;
  v_gold     integer;
  v_already  boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  -- Fetch item
  select * into v_item from public.shop_items where id = p_item_id;
  if not found then raise exception 'Item not found'; end if;

  -- Check already owned
  select exists(
    select 1 from public.owned_items where user_id = v_uid and item_id = p_item_id
  ) into v_already;
  if v_already then raise exception 'Already owned'; end if;

  -- Ensure profile exists and check gold
  insert into public.profiles (id, gold) values (v_uid, 0)
  on conflict (id) do nothing;

  select coalesce(gold, 0) into v_gold from public.profiles where id = v_uid;
  if v_gold < v_item.cost then raise exception 'Not enough gold'; end if;

  -- Deduct gold
  update public.profiles set gold = gold - v_item.cost where id = v_uid
  returning gold into v_gold;

  -- Record ownership
  insert into public.owned_items (user_id, item_id) values (v_uid, p_item_id)
  on conflict (user_id, item_id) do nothing;

  return jsonb_build_object(
    'success',        true,
    'item_id',        p_item_id,
    'remaining_gold', v_gold
  );
end;
$$;

-- ── Indexes ───────────────────────────────────────────────
create index if not exists habits_user_idx      on public.habits     (user_id);
create index if not exists logs_user_idx        on public.habit_logs (user_id);
create index if not exists logs_habit_idx       on public.habit_logs (habit_id);
create index if not exists logs_date_idx        on public.habit_logs (completed_at);
create index if not exists logs_user_date_idx   on public.habit_logs (user_id, completed_at);
create index if not exists owned_user_idx       on public.owned_items(user_id);
create index if not exists owned_item_user_idx  on public.owned_items(user_id, item_id);
