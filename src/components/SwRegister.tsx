"use client";

import { useEffect } from "react";

// Service Workerの登録だけを行う不可視コンポーネント(layoutにマウント)
export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // 登録失敗は致命的ではないので握りつぶす(通知機能だけが使えなくなる)
      });
  }, []);

  return null;
}
