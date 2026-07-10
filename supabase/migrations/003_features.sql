-- わかとぴあ 機能拡張マイグレーション (003)
-- フレンド機能・フレンド限定公開・パーツ見た目用の統計
-- Supabaseダッシュボード > SQL Editor にこのファイル全体を貼り付けて実行する
-- 前提: setup.sql と 002_features.sql 実行済み

-- ========== characters: 公開範囲 + 見た目パーツ用の統計 ==========

alter table public.characters
  add column visibility text not null default 'public'
    check (visibility in ('public', 'friends')),
  add column tastiness_total int not null default 0,
  add column meals_count int not null default 0,
  add column goal_days int not null default 0;

-- 既存ユーザーのバックフィル(おいしさ累計・食事回数)
update public.characters c
set meals_count = m.cnt, tastiness_total = m.tt
from (
  select user_id, count(*) as cnt, coalesce(sum(tastiness), 0) as tt
  from public.meals group by user_id
) m
where m.user_id = c.user_id;

-- 350g達成日数のバックフィル(JSTの日単位で集計)
update public.characters c
set goal_days = g.days
from (
  select user_id, count(*) as days from (
    select user_id
    from public.meals
    group by user_id, (created_at at time zone 'Asia/Tokyo')::date
    having sum(veggie_grams) >= 350
  ) t group by user_id
) g
where g.user_id = c.user_id;

-- ========== friendships: 1ペア1行、方向=申請者 ==========
-- 拒否・取り消し・フレンド解除 = 行の削除

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id)
);

-- A→BとB→Aを同一ペアとして一意化(逆向きの重複申請を防ぐ)
create unique index friendships_pair_uniq on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

-- ========== security definer 関数(RLS再帰の防火壁) ==========
-- ポリシー評価中に他テーブルのRLSを踏まないための関数群。
-- anonは auth.uid() が null なのですべて false → publicのみ見える。

-- 承認済みフレンドか
create or replace function public.is_friend(viewer uuid, owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = viewer and f.addressee_id = owner)
        or (f.requester_id = owner and f.addressee_id = viewer))
  );
$$;

-- 申請中も含めて繋がりがあるか(申請一覧で相手キャラの名前を表示するために必要)
create or replace function public.has_friendship(viewer uuid, owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where (f.requester_id = viewer and f.addressee_id = owner)
       or (f.requester_id = owner and f.addressee_id = viewer)
  );
$$;

-- そのユーザーの食事(写真)を見てよいか。charactersのvisibilityをRLSを介さず参照
create or replace function public.can_view_meals_of(owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.characters c
    where c.user_id = owner
      and (c.visibility = 'public'
        or c.user_id = (select auth.uid())
        or public.is_friend((select auth.uid()), owner))
  );
$$;

-- ========== friendships RLS ==========

alter table public.friendships enable row level security;

create policy "friendships_select_involved" on public.friendships
  for select using (
    (select auth.uid()) = requester_id or (select auth.uid()) = addressee_id
  );

-- 申請は必ず自分発かつpending
create policy "friendships_insert_requester" on public.friendships
  for insert with check (
    (select auth.uid()) = requester_id and status = 'pending'
  );

-- 承認は受け手のみ、acceptedへの変更のみ
create policy "friendships_update_addressee" on public.friendships
  for update using ((select auth.uid()) = addressee_id)
  with check (status = 'accepted' and (select auth.uid()) = addressee_id);

-- 拒否・取り消し・解除はどちらの当事者からでも
create policy "friendships_delete_involved" on public.friendships
  for delete using (
    (select auth.uid()) = requester_id or (select auth.uid()) = addressee_id
  );

-- ========== characters / meals の select ポリシー書き換え ==========
-- characters は pending 含む繋がりで可視(申請一覧に名前を出すため)、
-- meals(写真)は承認後のみ可視という使い分け。

drop policy "characters_select_all" on public.characters;
create policy "characters_select_visible" on public.characters
  for select using (
    visibility = 'public'
    or (select auth.uid()) = user_id
    or public.has_friendship((select auth.uid()), user_id)
  );

drop policy "meals_select_all" on public.meals;
create policy "meals_select_visible" on public.meals
  for select using (public.can_view_meals_of(user_id));

-- 注意: Storageのmealsバケットはpublicのまま(パスは推測不能なUUID+タイムスタンプ)。
-- フレンド限定はDB行(=アプリ上の一覧表示)を隠す仕組みであり、
-- 生URLを知っている人のアクセスまでは防がない(試作品としての割り切り)。
