import { supabase } from "./supabase";

const AVATARS_BUCKET = "avatars";
const GAMEBOARD_BUCKET = "gameboard-images";

/** Upload avatar for a user. Path: {userId}/{filename} */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return getPublicUrl(AVATARS_BUCKET, path);
}

/** Upload a gameboard character image. Path: {userId}/{characterId}.{ext} */
export async function uploadGameboardImage(
  userId: string,
  characterId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${characterId}.${ext}`;
  const { error } = await supabase.storage
    .from(GAMEBOARD_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return getPublicUrl(GAMEBOARD_BUCKET, path);
}

/** Get public URL for a storage path */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
