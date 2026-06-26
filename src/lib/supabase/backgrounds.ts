import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "trip-backgrounds";
export const MAX_CUSTOM_BACKGROUNDS = 10;

export type TripBackground = { id: string; storagePath: string; url: string };

function publicUrl(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** The tournament's uploaded custom backgrounds (Pro). Newest first. */
export async function loadTripBackgrounds(
  supabase: SupabaseClient,
  tripId: string
): Promise<TripBackground[]> {
  const { data, error } = await supabase
    .from("trip_backgrounds")
    .select("id,storage_path")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn't load backgrounds: ${error.message}`);
  return ((data ?? []) as { id: string; storage_path: string }[]).map((r) => ({
    id: r.id,
    storagePath: r.storage_path,
    url: publicUrl(supabase, r.storage_path),
  }));
}

/** Upload one image into the pool. Caller enforces the 10-image limit. */
export async function uploadTripBackground(
  supabase: SupabaseClient,
  args: { tripId: string; blob: Blob }
): Promise<TripBackground> {
  const path = `${args.tripId}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, args.blob, { contentType: "image/jpeg", upsert: false });
  if (up.error) throw new Error(`Upload failed: ${up.error.message}`);

  const { data, error } = await supabase
    .from("trip_backgrounds")
    .insert({ trip_id: args.tripId, storage_path: path })
    .select("id,storage_path")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`Couldn't save background: ${error.message}`);
  }
  const row = data as { id: string; storage_path: string };
  return { id: row.id, storagePath: row.storage_path, url: publicUrl(supabase, row.storage_path) };
}

export async function deleteTripBackground(
  supabase: SupabaseClient,
  bg: TripBackground
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([bg.storagePath]);
  const { error } = await supabase
    .from("trip_backgrounds")
    .delete()
    .eq("id", bg.id);
  if (error) throw new Error(`Couldn't delete background: ${error.message}`);
}

export async function setCourseBackground(
  supabase: SupabaseClient,
  courseId: string,
  value: string | null
): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({ image_url: value ?? "" })
    .eq("id", courseId);
  if (error) throw new Error(`Couldn't update background: ${error.message}`);
}

export async function setHeaderBackground(
  supabase: SupabaseClient,
  tripId: string,
  value: string | null
): Promise<void> {
  const { error } = await supabase
    .from("trips")
    .update({ header_background: value })
    .eq("id", tripId);
  if (error) throw new Error(`Couldn't update header: ${error.message}`);
}
