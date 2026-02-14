import { supabase } from "./supabase";
import type { GameboardCharacter } from "./types";

const TABLE = "gameboards";

export async function getGameboard(
  userId: string
): Promise<GameboardCharacter[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("characters")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const chars = data?.characters;
  if (Array.isArray(chars) && chars.length > 0) return chars as GameboardCharacter[];
  return [];
}

export async function saveGameboard(
  userId: string,
  characters: GameboardCharacter[]
): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      characters,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}
