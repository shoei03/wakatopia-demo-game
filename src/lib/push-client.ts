// Web Push のクライアント側処理(購読・解除・投稿通知の発火)
// 購読情報の読み書きはRLS下で supabase-js から直接行う
//
// ブラウザ対応:
// - Chrome / Edge / Firefox(デスクトップ・Android): タブでもPWAでも動く
// - macOS Safari 16.1+: ブラウザのまま動く(許可はユーザー操作起点必須)
// - iOS / iPadOS 16.4+: ホーム画面に追加したPWAからのみ動く

import { getSupabase } from "./supabase";

export type PushState =
  | "insecure" // httpsでない(iOSのSW/PushはHTTPS必須。http://192.168.x.x等)
  | "no-vapid" // NEXT_PUBLIC_VAPID_PUBLIC_KEY がビルドに入っていない
  | "sw-failed" // Service Workerの登録が確認できなかった
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

// ---------- プラットフォーム判定 ----------

// iPadOSのSafariはUAが"Macintosh"になるため、タッチポイント数でも判定する
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return /Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

// iOS上のブラウザ種別(案内文の出し分け用。iOSは全ブラウザがWebKitだが共有ボタンの場所が違う)
export type IosBrowser = "safari" | "chrome" | "firefox" | "edge" | "other";

export function iosBrowser(): IosBrowser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/CriOS/.test(ua)) return "chrome";
  if (/FxiOS/.test(ua)) return "firefox";
  if (/EdgiOS/.test(ua)) return "edge";
  if (/Safari/.test(ua)) return "safari";
  return "other";
}

// ホーム画面に追加したPWAとして起動しているか
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// 旧SafariはrequestPermissionがコールバック式なので両対応する
function requestNotificationPermission(): Promise<NotificationPermission> {
  return new Promise((resolve) => {
    const maybePromise = Notification.requestPermission(resolve);
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(resolve);
    }
  });
}

// SW登録を待つ。serviceWorker.readyは登録失敗時に永久に解決しないため
// getRegistration + リトライで上限を設ける
async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  for (let i = 0; i < 10; i++) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration?.active) return registration;
    if (registration && i >= 5) return registration; // installing/waitingでも返す
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  // httpだとserviceWorker自体が存在しないため、先に判定して原因を区別する
  if (!window.isSecureContext) return "insecure";
  if (!isPushSupported()) return "unsupported";
  if (!vapidPublicKey()) return "no-vapid";
  if (Notification.permission === "denied") return "denied";
  const registration = await getSwRegistration();
  if (!registration) return "sw-failed";
  const sub = await registration.pushManager.getSubscription();
  return sub ? "subscribed" : "unsubscribed";
}

// 通知許可 → push購読 → Supabaseに購読情報を保存
// 注意: Safariでは許可リクエストがユーザー操作起点である必要があるため、
// この関数はクリックハンドラから直接呼び、先に許可を取ってからSWを待つ
export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error(
      isIosDevice() && !isStandalone()
        ? "iPhoneでは「ホーム画面に追加」したアプリから通知をオンにしてね"
        : "このブラウザは通知に対応していません"
    );
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") throw new Error("通知が許可されませんでした");

  const registration = await getSwRegistration();
  if (!registration) {
    throw new Error("通知の準備に失敗しました。ページを再読み込みしてみてね");
  }
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
  const registration = await getSwRegistration();
  if (!registration) return;
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

// フレンド申請の通知を依頼する(失敗しても呼び出し元は気にしない)
export async function notifyFriendRequest(targetUserId: string): Promise<void> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;

  await fetch("/api/push/friend-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetUserId }),
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
