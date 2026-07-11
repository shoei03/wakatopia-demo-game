"use client";

import {
  useNotificationLog,
  useRequireUserId,
  type NotificationLogRow,
} from "@/lib/queries";
import { jstDateStr } from "@/lib/game";
import BottomNav from "@/components/BottomNav";

const LIMIT = 50;

const KIND_LABELS: Record<string, string> = {
  reminder_morning: "🥬 朝ごはんのリマインド",
  reminder_noon: "🥬 昼ごはんのリマインド",
  reminder_evening: "🥬 晩ごはんのリマインド",
  friend_post: "🌳 フレンドがごはんを食べたよ",
  friend_request: "👥 フレンドしんせいがきたよ",
  test: "🥬 テスト通知",
};

const labelOf = (kind: string) => KIND_LABELS[kind] ?? `🔔 ${kind}`;

const timeOf = (sentAt: string) =>
  new Date(sentAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

const headingOf = (date: string) =>
  new Date(`${date}T00:00:00+09:00`).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  });

export default function NotificationsPage() {
  const { userId, checking } = useRequireUserId();
  const logsQuery = useNotificationLog(userId, LIMIT);

  const logs = logsQuery.data ?? [];
  const error = logsQuery.error
    ? logsQuery.error instanceof Error
      ? logsQuery.error.message
      : "読み込みに失敗しました"
    : null;

  // キャッシュ済みなら即表示。スピナーは初回(キャッシュなし)のみ
  if (checking || logsQuery.isPending) {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        よみこみ中…
      </main>
    );
  }

  // JSTの日付でグループ化(新しい日付が先頭)
  const byDate = new Map<string, NotificationLogRow[]>();
  for (const log of logs) {
    const date = jstDateStr(log.sent_at);
    const list = byDate.get(date);
    if (list) list.push(log);
    else byDate.set(date, [log]);
  }

  return (
    <main className="flex-1 max-w-md w-full mx-auto p-4 pb-24 space-y-4">
      <header>
        <h1 className="text-xl font-extrabold text-leaf-700">🔔 通知のきろく</h1>
        <p className="text-xs text-foreground/50 mt-0.5">直近{LIMIT}件</p>
      </header>

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}

      {byDate.size === 0 ? (
        <p className="text-sm text-foreground/50 bg-white rounded-2xl border border-leaf-100 p-4">
          まだ通知はありません。せっていで通知をオンにすると、ごはんのリマインドが届くよ!
        </p>
      ) : (
        [...byDate.entries()].map(([date, dayLogs]) => (
          <section
            key={date}
            className="rounded-2xl bg-white border border-leaf-100 shadow-sm p-4 space-y-2"
          >
            <h2 className="font-extrabold text-sm text-foreground/70">
              {headingOf(date)}
            </h2>
            <ul className="space-y-1.5">
              {dayLogs.map((log) => (
                <li key={log.id} className="flex items-center gap-3">
                  <span className="text-xs text-foreground/40 font-bold w-10 shrink-0">
                    {timeOf(log.sent_at)}
                  </span>
                  <span className="text-sm font-bold">{labelOf(log.kind)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <BottomNav />
    </main>
  );
}
