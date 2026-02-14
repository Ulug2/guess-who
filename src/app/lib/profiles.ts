import { supabase } from "./supabase";
import type { Profile } from "./types";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function searchProfilesByUsername(
  usernameQuery: string,
  excludeUserId: string
): Promise<Profile[]> {
  const q = usernameQuery.trim().toLowerCase();
  if (!q) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at, updated_at")
    .ilike("username", `%${q}%`)
    .neq("id", excludeUserId)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateProfileAvatar(
  userId: string,
  avatarUrl: string
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

/** Ensure a profile exists (e.g. for users created before profiles table existed) */
export async function ensureProfile(
  userId: string,
  username: string
): Promise<Profile | null> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return getProfile(userId); // race: already created
    throw error;
  }
  return data as Profile;
}
