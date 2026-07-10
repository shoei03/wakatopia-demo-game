import type { Metadata } from "next";
import { getServerAnonClient, hasSupabaseEnv } from "@/lib/supabase";
import { levelFromExp } from "@/lib/game";
import type { Character, Meal } from "@/lib/types";
import CharacterProfile, {
  CharacterProfileLoader,
} from "@/components/CharacterProfile";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// anonクライアントなのでRLS上publicキャラのみ取得できる
async function fetchPublicCharacter(id: string): Promise<Character | null> {
  const { data } = await getServerAnonClient()
    .from("characters")
    .select()
    .eq("id", id)
    .maybeSingle();
  return data as Character | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!hasSupabaseEnv()) return {};
  const { id } = await params;
  const character = await fetchPublicCharacter(id);
  // フレンド限定キャラの名前をOGタグに漏らさない(anonで取れない=非公開)
  if (!character) return { title: "わかとぴあ" };
  const level = levelFromExp(character.exp);
  return {
    title: `${character.name} Lv.${level} | わかとぴあ`,
    description: `${character.name}は🔥${character.streak}日連続で食事を記録中!野菜でそだつ育成ゲーム「わかとぴあ」`,
  };
}

export default async function CharacterPage({ params }: Props) {
  if (!hasSupabaseEnv()) {
    return (
      <main className="flex-1 flex items-center justify-center text-foreground/50">
        Supabaseのセットアップが必要です
      </main>
    );
  }

  const { id } = await params;
  const character = await fetchPublicCharacter(id);

  // anonで取れない場合はフレンド限定の可能性があるため、
  // notFoundにせずクライアント側(ログインセッション)で再取得する
  if (!character) {
    return <CharacterProfileLoader characterId={id} />;
  }

  const { data: mealsData } = await getServerAnonClient()
    .from("meals")
    .select()
    .eq("user_id", character.user_id)
    .order("created_at", { ascending: false })
    .limit(9);
  const meals = (mealsData ?? []) as Meal[];

  return <CharacterProfile character={character} meals={meals} />;
}
