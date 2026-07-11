import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type NotificationKind =
  | "reminder_morning"
  | "reminder_noon"
  | "reminder_evening"
  | "friend_post"
  | "friend_request"
  | "test";

let vapidConfigured = false;

function ensureVapid(): void {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY と VAPID_PRIVATE_KEY を設定してください"
    );
  }
  webpush.setVapidDetails("mailto:noreply@wakatopia.app", publicKey, privateKey);
  vapidConfigured = true;
}

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// 1ユーザーの全購読へ送信。無効になった購読(404/410)は削除する。
// 送信成功時は notification_log に記録(重複送信防止と将来の時間学習用)。
export async function sendPushToUser(
  admin: SupabaseClient,
  userId: string,
  kind: NotificationKind,
  payload: PushPayload
): Promise<number> {
  ensureVapid();

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select()
    .eq("user_id", userId);
  const subscriptions = (subs ?? []) as SubscriptionRow[];
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body
      )
    )
  );

  const expired: string[] = [];
  let sent = 0;
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent++;
      return;
    }
    const reason = result.reason as { statusCode?: number; body?: string };
    const statusCode = reason?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      expired.push(subscriptions[i].endpoint);
      return;
    }
    // 403(VAPID不一致)等はVercelログで追えるように残す
    console.error(
      `push send failed: user=${userId} kind=${kind} status=${statusCode} body=${reason?.body ?? result.reason}`
    );
  });

  if (expired.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expired);
  }

  if (sent > 0) {
    await admin
      .from("notification_log")
      .insert({ user_id: userId, kind });
  }

  return sent;
}
