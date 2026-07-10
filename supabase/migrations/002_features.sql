-- わかとぴあ 機能拡張マイグレーション (002)
-- Supabaseダッシュボード > SQL Editor にこのファイル全体を貼り付けて実行する
-- 前提: setup.sql 実行済み

-- ========== meals: スロット・グラム・おいしさ・EXP記録 ==========

alter table public.meals
  add column meal_slot text check (meal_slot in ('morning', 'noon', 'evening')),
  add column veggie_grams int not null default 0 check (veggie_grams between 0 and 1000),
  add column tastiness int check (tastiness between 1 and 5),
  add column exp_gained int; -- 旧行はnull。削除時はscoreにフォールバック

-- 自分の食事記録は削除できる(誤投稿の取り消し用)
create policy "meals_delete_own" on public.meals
  for delete using ((select auth.uid()) = user_id);

-- 自分のフォルダのStorageオブジェクトも削除できる
create policy "meals_storage_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'meals'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ========== characters: 進化分岐用の栄養素累積 ==========

alter table public.characters
  add column veggie_exp int not null default 0,
  add column protein_exp int not null default 0,
  add column carb_exp int not null default 0;

-- ========== Web Push 購読 ==========

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subs_select_own" on public.push_subscriptions
  for select using ((select auth.uid()) = user_id);
create policy "push_subs_insert_own" on public.push_subscriptions
  for insert with check ((select auth.uid()) = user_id);
create policy "push_subs_update_own" on public.push_subscriptions
  for update using ((select auth.uid()) = user_id);
create policy "push_subs_delete_own" on public.push_subscriptions
  for delete using ((select auth.uid()) = user_id);

-- ========== 通知設定 ==========
-- 時刻カラムはJST(日本時間)の壁時計時刻として解釈する規約

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  remind_morning boolean not null default false,
  morning_time time not null default '08:00',
  remind_noon boolean not null default false,
  noon_time time not null default '12:30',
  remind_evening boolean not null default false,
  evening_time time not null default '19:00',
  notify_on_friend_post boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "notif_prefs_select_own" on public.notification_preferences
  for select using ((select auth.uid()) = user_id);
create policy "notif_prefs_insert_own" on public.notification_preferences
  for insert with check ((select auth.uid()) = user_id);
create policy "notif_prefs_update_own" on public.notification_preferences
  for update using ((select auth.uid()) = user_id);

-- ========== 通知送信ログ ==========
-- 重複送信防止 + 将来の「通知→撮影までの時間学習」用フック
-- (opened_at はSWのnotificationclickからビーコンで記録する将来拡張)

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null, -- 'reminder_morning' | 'reminder_noon' | 'reminder_evening' | 'friend_post'
  sent_at timestamptz not null default now(),
  opened_at timestamptz
);

alter table public.notification_log enable row level security;

-- 読み取りは本人のみ。書き込みポリシーは作らない(service roleのみが書く)
create policy "notif_log_select_own" on public.notification_log
  for select using ((select auth.uid()) = user_id);

create index notification_log_user_kind_idx
  on public.notification_log (user_id, kind, sent_at desc);
