// Shared types for Supabase-backed features

export type FriendRequestStatus = "pending" | "accepted" | "declined";
export type ChallengeStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendRequestStatus;
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
}

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: ChallengeStatus;
  created_at: string;
  game_characters?: GameboardCharacter[] | null;
  challenger_profile?: Profile | null;
  challenged_profile?: Profile | null;
}

export interface GameboardCharacter {
  id: string;
  name: string;
  imageUrl: string | null;
}
