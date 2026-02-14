import { supabase } from "./supabase";
import { getProfile } from "./profiles";
import type { Profile, Challenge, GameboardCharacter } from "./types";

export interface ChallengeWithProfiles extends Challenge {
  challenger_profile: Profile | null;
  challenged_profile: Profile | null;
}

/** Challenges where the current user is challenged (incoming) */
export async function getIncomingChallenges(
  userId: string
): Promise<ChallengeWithProfiles[]> {
  const { data: rows, error } = await supabase
    .from("challenges")
    .select("id, challenger_id, challenged_id, status, created_at")
    .eq("challenged_id", userId)
    .in("status", ["pending"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rows?.length) return [];
  const challengerIds = [...new Set(rows.map((r) => r.challenger_id))];
  const profileMap = new Map<string, Profile | null>();
  await Promise.all(
    challengerIds.map(async (id) => {
      const p = await getProfile(id);
      profileMap.set(id, p);
    })
  );
  return rows.map((r) => ({
    ...r,
    challenger_profile: profileMap.get(r.challenger_id) ?? null,
    challenged_profile: null,
  })) as ChallengeWithProfiles[];
}

/** Single challenge by id (for waiting screen + game board) */
export async function getChallenge(
  challengeId: string,
  userId: string
): Promise<ChallengeWithProfiles | null> {
  const { data: row, error } = await supabase
    .from("challenges")
    .select("id, challenger_id, challenged_id, status, created_at, game_characters")
    .eq("id", challengeId)
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const [challengerProfile, challengedProfile] = await Promise.all([
    getProfile(row.challenger_id),
    getProfile(row.challenged_id),
  ]);
  return {
    ...row,
    challenger_profile: challengerProfile,
    challenged_profile: challengedProfile,
  } as ChallengeWithProfiles;
}

/** Set the challenger's gameboard on the challenge so both players see the same cards. */
export async function setChallengeGameCharacters(
  challengeId: string,
  challengerUserId: string,
  characters: GameboardCharacter[]
): Promise<void> {
  const { error } = await supabase
    .from("challenges")
    .update({ game_characters: characters })
    .eq("id", challengeId)
    .eq("challenger_id", challengerUserId);
  if (error) throw error;
}

/** Create a challenge (challenger → challenged) */
export async function createChallenge(
  challengerId: string,
  challengedId: string
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("challenges")
    .insert({
      challenger_id: challengerId,
      challenged_id: challengedId,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

/** Accept a challenge (challenged user only) */
export async function acceptChallenge(
  challengeId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("challenges")
    .update({ status: "accepted" })
    .eq("id", challengeId)
    .eq("challenged_id", userId);
  if (error) throw error;
}

/** Decline a challenge */
export async function declineChallenge(
  challengeId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("challenges")
    .update({ status: "declined" })
    .eq("id", challengeId)
    .eq("challenged_id", userId);
  if (error) throw error;
}

/** Cancel a challenge (challenger only) */
export async function cancelChallenge(
  challengeId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("challenges")
    .update({ status: "cancelled" })
    .eq("id", challengeId)
    .eq("challenger_id", userId);
  if (error) throw error;
}

/** End the game (either player). Sets ended_at so the other player is notified. */
export async function endChallenge(
  challengeId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("challenges")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", challengeId)
    .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`);
  if (error) throw error;
}

/** Subscribe to challenge status/ended changes (waiting screen + game board) */
export function subscribeToChallenge(
  challengeId: string,
  callback: (status: string) => void
) {
  return supabase
    .channel(`challenge:${challengeId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "challenges",
        filter: `id=eq.${challengeId}`,
      },
      (payload) => {
        const row = payload.new as { status?: string; ended_at?: string | null };
        if (row?.ended_at) callback("ended");
        else if (row?.status) callback(row.status);
      }
    )
    .subscribe();
}
