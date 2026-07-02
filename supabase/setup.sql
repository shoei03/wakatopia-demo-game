-- わかとぴあ育成ゲーム: Supabase セットアップSQL
-- Supabaseダッシュボード > SQL Editor にこのファイル全体を貼り付けて実行する

-- ========== テーブル ==========

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  exp int not null default 0,
  veggie_points int not null default 0,
  streak int not null default 0,
  last_meal_date date,
  recent_veggie_avg real not null default 0,
  created_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_url text not null,
  veggie_amount int not null check (veggie_amount between 0 and 3),
  has_protein boolean not null default false,
  has_carbs boolean not null default false,
  score int not null,
  created_at timestamptz not null default now()
);

create index meals_user_created_idx on public.meals (user_id, created_at desc);

-- ========== RLS: 読み取りは全員可(ひろば用)、書き込みは本人のみ ==========

alter table public.characters enable row level security;

create policy "characters_select_all" on public.characters
  for select using (true);
create policy "characters_insert_own" on public.characters
  for insert with check ((select auth.uid()) = user_id);
create policy "characters_update_own" on public.characters
  for update using ((select auth.uid()) = user_id);

alter table public.meals enable row level security;

create policy "meals_select_all" on public.meals
  for select using (true);
create policy "meals_insert_own" on public.meals
  for insert with check ((select auth.uid()) = user_id);

-- ========== Storage: 食事写真バケット ==========

insert into storage.buckets (id, name, public)
values ('meals', 'meals', true)
on conflict (id) do nothing;

-- 自分のユーザーIDのフォルダにのみアップロード可
create policy "meals_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "meals_read_all" on storage.objects
  for select using (bucket_id = 'meals');
