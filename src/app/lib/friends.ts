import { supabase } from "./supabase";
import { getProfile } from "./profiles";
import type { Profile } from "./types";
import type { FriendRequest } from "./types";

export interface FriendRequestWithProfile extends FriendRequest {
  from_profile: Profile | null;
  to_profile: Profile | null;
}

/** List of users who are friends with the current user (accepted requests) */
export async function getFriends(userId: string): Promise<Profile[]> {
  const { data: rows, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .eq("status", "accepted");
  if (error) throw error;
  if (!rows?.length) return [];
  const friendIds = [...new Set(rows.map((r) => (r.from_user_id === userId ? r.to_user_id : r.from_user_id)))];
  const profiles = await Promise.all(friendIds.map((id) => getProfile(id)));
  return profiles.filter((p): p is Profile => p != null);
}

/** Pending requests where the current user is the receiver */
export async function getPendingFriendRequests(
  userId: string
): Promise<FriendRequestWithProfile[]> {
  const { data: rows, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .eq("to_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rows?.length) return [];
  const fromIds = [...new Set(rows.map((r) => r.from_user_id))];
  const profileMap = new Map<string, Profile | null>();
  await Promise.all(
    fromIds.map(async (id) => {
      const p = await getProfile(id);
      profileMap.set(id, p);
    })
  );
  return rows.map((r) => ({
    ...r,
    from_profile: profileMap.get(r.from_user_id) ?? null,
    to_profile: null,
  })) as FriendRequestWithProfile[];
}

/** Send a friend request */
export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const { error } = await supabase.from("friend_requests").insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") throw new Error("Friend request already sent.");
    throw error;
  }
}

/** Accept a friend request (receiver only) */
export async function acceptFriendRequest(
  requestId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("to_user_id", userId);
  if (error) throw error;
}

/** Decline a friend request */
export async function declineFriendRequest(
  requestId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", requestId)
    .eq("to_user_id", userId);
  if (error) throw error;
}

/** Check if two users are friends */
export async function areFriends(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id")
    .or(
      `and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`
    )
    .eq("status", "accepted")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Check if there's already a pending request between two users */
export async function hasPendingRequest(
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("from_user_id", fromUserId)
    .eq("to_user_id", toUserId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
