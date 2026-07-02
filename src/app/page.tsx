import { hasSupabaseEnv } from "@/lib/supabase";
import CharacterSvg from "@/components/CharacterSvg";
import LoginButton from "@/components/LoginButton";

export default function LandingPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow-sm border border-leaf-100">
          <h1 className="text-lg font-bold mb-3">⚙️ セットアップが必要です</h1>
          <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
            <li>Supabaseプロジェクトを作成する</li>
            <li>
              SQL Editorで <code className="bg-leaf-50 px-1 rounded">supabase/setup.sql</code>{" "}
              を実行する
            </li>
            <li>
              <code className="bg-leaf-50 px-1 rounded">.env.local</code> に URL と anon key
              を設定する(<code className="bg-leaf-50 px-1 rounded">.env.local.example</code>{" "}
              参照)
            </li>
          </ol>
          <p className="mt-3 text-sm text-foreground/70">
            詳しい手順は <code className="bg-leaf-50 px-1 rounded">SETUP.md</code> を見てください。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="animate-bob">
        <CharacterSvg stage={3} mood="happy" size={180} />
      </div>
      <div>
        <h1 className="text-3xl font-extrabold text-leaf-700 mb-2">わかとぴあ</h1>
        <p className="text-foreground/70 leading-relaxed">
          ごはんの写真をパシャっと記録。
          <br />
          野菜をたべると、キミの相棒がそだつ。
        </p>
      </div>
      <LoginButton />
      <p className="text-xs text-foreground/50 max-w-[280px]">
        Googleアカウントでログインすると、機種変更しても同じキャラに戻れます
      </p>
    </main>
  );
}
