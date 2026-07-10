// わかとぴあ Service Worker: プッシュ通知の受信と表示
// オフラインキャッシュは未対応(将来Serwist等で拡張)

self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "わかとぴあ", body: event.data.text() };
  }
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/home",
    },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "わかとぴあ", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/home";
  // Safariは相対URLのopenWindowが不安定なので絶対URLにする
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        // すでに開いているウィンドウがあればフォーカスして遷移
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            if ("navigate" in client) client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});

// ブラウザが購読を自動更新したとき、新しい購読情報をサーバへ引き継ぐ
// (これがないとChromeやSafariの購読ローテーション後に通知が届かなくなる)
self.addEventListener("pushsubscriptionchange", function (event) {
  const oldEndpoint = event.oldSubscription && event.oldSubscription.endpoint;
  const applicationServerKey =
    event.oldSubscription && event.oldSubscription.options
      ? event.oldSubscription.options.applicationServerKey
      : null;
  if (!applicationServerKey) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then(function (newSubscription) {
        return fetch("/api/push/resubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldEndpoint: oldEndpoint,
            subscription: newSubscription.toJSON(),
          }),
        });
      })
      .catch(function () {
        // 再購読に失敗しても致命的ではない(次回設定画面を開いたときに再購読される)
      })
  );
});
