// フレンド機能のデータアクセス(RLS下で supabase-js から直接操作)
// friendships は1ペア1行。方向=申請者。拒否/取り消し/解除=行削除。

import { getSupabase } from "./supabase";
import type {
  Character,
  CharacterVisibility,
  Friendship,
} from "./types";

export type FriendEntry = {
  friendship: Friendship;
  character: Character | null; // 相手のキャラ(RLSで見える範囲)
};

export type FriendLists = {
  friends: FriendEntry[]; // accepted
  incoming: FriendEntry[]; // pending かつ 自分が受け手
  outgoing: FriendEntry[]; // pending かつ 自分が申請者
};

export async function sendFriendRequest(
  myUserId: string,
  targetUserId: string
): Promise<Friendship> {
  const { data, error } = await getSupabase()
    .from("friendships")
    .insert({ requester_id: myUserId, addressee_id: targetUserId })
    .select()
    .single();
  if (error) throw error;

  // 申請プッシュ通知(失敗しても申請自体は成立)
  import("./push-client")
    .then((m) => m.notifyFriendRequest(targetUserId))
    .catch(() => {});

  return data as Friendship;
}

export async function acceptFriendRequest(
  friendshipId: string
): Promise<Friendship> {
  const { data, error } = await getSupabase()
    .from("friendships")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .select()
    .single();
  if (error) throw error;
  return data as Friendship;
}

// 拒否・申請取り消し・フレンド解除を兼ねる
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("friendships")
    .delete()
    .eq("id", friendshipId);
  if (error) throw error;
}

export async function fetchFriendLists(
  myUserId: string
): Promise<FriendLists> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("friendships")
    .select()
    .or(`requester_id.eq.${myUserId},addressee_id.eq.${myUserId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const friendships = (data ?? []) as Friendship[];

  // 相手のキャラをまとめて取得して結合
  const otherIds = [
    ...new Set(
      friendships.map((f) =>
        f.requester_id === myUserId ? f.addressee_id : f.requester_id
      )
    ),
  ];
  const characterByUser = new Map<string, Character>();
  if (otherIds.length > 0) {
    const { data: chars } = await supabase
      .from("characters")
      .select()
      .in("user_id", otherIds);
    for (const c of (chars ?? []) as Character[]) {
      characterByUser.set(c.user_id, c);
    }
  }

  const toEntry = (f: Friendship): FriendEntry => ({
    friendship: f,
    character:
      characterByUser.get(
        f.requester_id === myUserId ? f.addressee_id : f.requester_id
      ) ?? null,
  });

  return {
    friends: friendships.filter((f) => f.status === "accepted").map(toEntry),
    incoming: friendships
      .filter((f) => f.status === "pending" && f.addressee_id === myUserId)
      .map(toEntry),
    outgoing: friendships
      .filter((f) => f.status === "pending" && f.requester_id === myUserId)
      .map(toEntry),
  };
}

// /c/[id] のフレンドボタン状態用: 相手との関係を1行取得
export async function fetchFriendshipWith(
  myUserId: string,
  otherUserId: string
): Promise<Friendship | null> {
  const { data, error } = await getSupabase()
    .from("friendships")
    .select()
    .or(
      `and(requester_id.eq.${myUserId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${myUserId})`
    )
    .maybeSingle();
  if (error) throw error;
  return data as Friendship | null;
}

export async function updateVisibility(
  characterId: string,
  visibility: CharacterVisibility
): Promise<Character> {
  const { data, error } = await getSupabase()
    .from("characters")
    .update({ visibility })
    .eq("id", characterId)
    .select()
    .single();
  if (error) throw error;
  return data as Character;
}
