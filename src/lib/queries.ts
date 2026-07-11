"use client";

// ページ間で共有するデータ取得フック。queryKeyの設計はこのファイルに集約する。
// キー階層: ["session"] / ["character", userId] / ["meals", 種別, userId, ...]
//           / ["plaza"] / ["friends", userId] / ["notifications", userId]

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, hasSupabaseEnv } from "./supabase";
import {
  fetchMealsSince,
  fetchMyCharacter,
  fetchRecentMeals,
} from "./meals";
import { fetchFriendLists, type FriendLists } from "./friends";
import { jstTodayStartIso, todayStrJst } from "./game";
import type { Character, Meal } from "./types";

export type NotificationLogRow = {
  id: string;
  kind: string;
  sent_at: string;
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async (): Promise<Session | null> => {
      const { data } = await getSupabase().auth.getSession();
      return data.session;
    },
    // 以後の更新は Providers の onAuthStateChange が反映する
    staleTime: Infinity,
  });
}

// ログイン必須ページ用: セッション確定後、未ログインなら "/" へ戻す
export function useRequireUserId(): {
  userId: string | null;
  checking: boolean;
} {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/");
  }, [isPending, session, router]);

  return { userId: session?.user?.id ?? null, checking: isPending };
}

export function useMyCharacter(userId: string | null) {
  return useQuery({
    queryKey: ["character", userId],
    queryFn: () => fetchMyCharacter(userId!),
    enabled: !!userId,
  });
}

export function useRecentMeals(userId: string | null, limit = 12) {
  return useQuery({
    queryKey: ["meals", "recent", userId, limit],
    queryFn: () => fetchRecentMeals(userId!, limit),
    enabled: !!userId,
  });
}

// 当日(JST)の食事。日付をキーに含め、日付が変わったら別キャッシュになる
export function useTodayMeals(userId: string | null) {
  return useQuery({
    queryKey: ["meals", "today", userId, todayStrJst()],
    queryFn: () => fetchMealsSince(userId!, jstTodayStartIso()),
    enabled: !!userId,
  });
}

// 履歴ページ用: JSTの今日0時からdays日さかのぼった時点以降の食事
export function useMealHistory(userId: string | null, days: number) {
  return useQuery({
    queryKey: ["meals", "history", userId, days, todayStrJst()],
    queryFn: () => {
      const since = new Date(
        Date.parse(jstTodayStartIso()) - days * 86_400_000
      ).toISOString();
      return fetchMealsSince(userId!, since);
    },
    enabled: !!userId,
  });
}

export function usePlazaCharacters() {
  return useQuery({
    queryKey: ["plaza"],
    queryFn: async (): Promise<Character[]> => {
      const { data, error } = await getSupabase()
        .from("characters")
        .select()
        .order("streak", { ascending: false })
        .order("exp", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Character[];
    },
    enabled: hasSupabaseEnv(),
  });
}

export function useFriendLists(userId: string | null) {
  return useQuery({
    queryKey: ["friends", userId],
    queryFn: (): Promise<FriendLists> => fetchFriendLists(userId!),
    enabled: !!userId,
  });
}

export function useNotificationLog(userId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["notifications", userId, limit],
    queryFn: async (): Promise<NotificationLogRow[]> => {
      const { data, error } = await getSupabase()
        .from("notification_log")
        .select("id, kind, sent_at")
        .eq("user_id", userId!)
        .order("sent_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as NotificationLogRow[];
    },
    enabled: !!userId,
  });
}

// 自分のキャラ更新(名前変更・投稿・削除の結果)をキャッシュへ反映する
export function setCharacterCache(
  queryClient: QueryClient,
  userId: string,
  character: Character | null
) {
  queryClient.setQueryData(["character", userId], character);
}

// 食事の投稿/削除後の共通処理: キャラ即時反映 + 食事系・ひろばを再取得
export function applyMealMutation(
  queryClient: QueryClient,
  userId: string,
  character: Character
) {
  setCharacterCache(queryClient, userId, character);
  queryClient.invalidateQueries({ queryKey: ["meals"] });
  queryClient.invalidateQueries({ queryKey: ["plaza"] });
}

// 削除した食事を再フェッチ完了前にキャッシュから除いて即時反映する
export function removeMealFromCache(queryClient: QueryClient, mealId: string) {
  queryClient.setQueriesData<Meal[]>(
    { queryKey: ["meals"] },
    (old) => old?.filter((m) => m.id !== mealId)
  );
}
