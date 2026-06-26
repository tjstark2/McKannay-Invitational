// Supabase reads/writes for the Clubhouse feature (Phase 1: photos).
// Mirrors the conventions in queries.ts — callers pass in the shared client
// (from getSupabaseClient()) and these functions throw on error.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TripMessage, TripMessageReaction, TripPhoto } from "@/types";

const BUCKET = "trip-photos";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

type TripPhotoRow = {
  id: string;
  trip_id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

function mapPhoto(row: TripPhotoRow): TripPhoto {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    storagePath: row.storage_path,
    caption: row.caption,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
}

/** Newest-first list of a trip's photos (rows only — fetch signed URLs separately). */
export async function loadPhotos(
  supabase: SupabaseClient,
  tripId: string
): Promise<TripPhoto[]> {
  const { data, error } = await supabase
    .from("trip_photos")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Couldn't load photos: ${error.message}`);
  return ((data ?? []) as TripPhotoRow[]).map(mapPhoto);
}

/** A short-lived signed URL so private photos can be displayed in the feed. */
export async function signedUrlFor(
  supabase: SupabaseClient,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * Upload an already-compressed JPEG blob, then record the row.
 * Path convention: "<trip_id>/<photo_id>.jpg".
 */
export async function uploadPhoto(
  supabase: SupabaseClient,
  args: {
    tripId: string;
    userId: string;
    blob: Blob;
    width: number;
    height: number;
    caption?: string | null;
  }
): Promise<TripPhoto> {
  const photoId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const storagePath = `${args.tripId}/${photoId}.jpg`;

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, args.blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (upload.error) {
    throw new Error(`Couldn't upload photo: ${upload.error.message}`);
  }

  const caption = args.caption?.trim() ? args.caption.trim() : null;

  const insert = await supabase
    .from("trip_photos")
    .insert({
      id: photoId,
      trip_id: args.tripId,
      user_id: args.userId,
      storage_path: storagePath,
      caption,
      width: args.width,
      height: args.height,
    })
    .select("*")
    .single();

  if (insert.error) {
    // Roll back the stored file so we don't orphan it.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Couldn't save photo: ${insert.error.message}`);
  }

  return mapPhoto(insert.data as TripPhotoRow);
}

/** Delete a photo's row and its stored file (only works on your own photos). */
export async function deletePhoto(
  supabase: SupabaseClient,
  photo: Pick<TripPhoto, "id" | "storagePath">
): Promise<void> {
  const { error } = await supabase
    .from("trip_photos")
    .delete()
    .eq("id", photo.id);

  if (error) throw new Error(`Couldn't delete photo: ${error.message}`);

  // Best-effort file cleanup; the row is already gone.
  await supabase.storage.from(BUCKET).remove([photo.storagePath]);
}

// ---- Chat (Phase 2) -------------------------------------------------------

type TripMessageRow = {
  id: string;
  trip_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type ReactionRow = {
  message_id: string;
  user_id: string;
  emoji: string;
};

function mapMessage(row: TripMessageRow): TripMessage {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Oldest-first list of a trip's chat messages. */
export async function loadMessages(
  supabase: SupabaseClient,
  tripId: string
): Promise<TripMessage[]> {
  const { data, error } = await supabase
    .from("trip_messages")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Couldn't load messages: ${error.message}`);
  return ((data ?? []) as TripMessageRow[]).map(mapMessage);
}

/** Reactions for a set of message ids. */
export async function loadReactions(
  supabase: SupabaseClient,
  messageIds: string[]
): Promise<TripMessageReaction[]> {
  if (messageIds.length === 0) return [];
  const { data, error } = await supabase
    .from("trip_message_reactions")
    .select("message_id,user_id,emoji")
    .in("message_id", messageIds);

  if (error) throw new Error(`Couldn't load reactions: ${error.message}`);
  return ((data ?? []) as ReactionRow[]).map((r) => ({
    messageId: r.message_id,
    userId: r.user_id,
    emoji: r.emoji,
  }));
}

/** Post a chat message. Returns the saved row. */
export async function sendMessage(
  supabase: SupabaseClient,
  args: { tripId: string; userId: string; body: string }
): Promise<TripMessage> {
  const body = args.body.trim();
  if (!body) throw new Error("Message is empty.");

  const { data, error } = await supabase
    .from("trip_messages")
    .insert({ trip_id: args.tripId, user_id: args.userId, body })
    .select("*")
    .single();

  if (error) throw new Error(`Couldn't send message: ${error.message}`);
  return mapMessage(data as TripMessageRow);
}

/**
 * Toggle one emoji reaction on a message for the current user.
 * Returns "added" or "removed" so the caller can update local state.
 */
export async function toggleReaction(
  supabase: SupabaseClient,
  args: { messageId: string; userId: string; emoji: string; isOn: boolean }
): Promise<"added" | "removed"> {
  if (args.isOn) {
    const { error } = await supabase
      .from("trip_message_reactions")
      .delete()
      .eq("message_id", args.messageId)
      .eq("user_id", args.userId)
      .eq("emoji", args.emoji);
    if (error) throw new Error(`Couldn't remove reaction: ${error.message}`);
    return "removed";
  }

  const { error } = await supabase
    .from("trip_message_reactions")
    .insert({
      message_id: args.messageId,
      user_id: args.userId,
      emoji: args.emoji,
    });
  if (error) throw new Error(`Couldn't add reaction: ${error.message}`);
  return "added";
}
