// Web Push のクライアント側処理(購読・解除・投稿通知の発火)
// 購読情報の読み書きはRLS下で supabase-js から直接行う

import { getSupabase } from "./supabase";

export type PushState =
  | "unsupported" // ブラウザ非対応(iOSの非standalone Safariなど)
  | "denied" // 通知許可が拒否済み
  | "unsubscribed"
  | "subscribed";

function vapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported() || !vapidPublicKey()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  return sub ? "subscribed" : "unsubscribed";
}

// 通知許可 → push購読 → Supabaseに購読情報を保存
export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported()) throw new Error("このブラウザは通知に対応していません");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("通知が許可されませんでした");

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey()),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("購読情報の取得に失敗しました");
  }

  const { error } = await getSupabase()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: "endpoint" }
    );
  if (error) throw error;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await getSupabase()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}

// 投稿完了後に他ユーザへ通知を依頼する(失敗しても呼び出し元は気にしない)
export async function notifyFriendPost(
  characterName: string,
  score: number
): Promise<void> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;

  await fetch("/api/push/notify-post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ characterName, score }),
  });
}

// 設定画面の「テスト通知」用
export async function sendTestNotification(): Promise<void> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("ログインが必要です");

  const res = await fetch("/api/push/test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("テスト通知の送信に失敗しました");
}
