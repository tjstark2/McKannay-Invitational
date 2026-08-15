// Per-course hole data (par + stroke index). Required before a hole-by-hole
// round can start - it's what drives stroke allocation on the right holes.

import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseHole = { hole: number; par: number; si: number };

export type CourseLite = {
  id: string;
  name: string;
  yardage: number | null;
  par: number | null;
  rating: number | null;
  slope: number | null;
  teeName: string | null;
  address: string | null;
  holeCount: number; // how many holes have data (18 = complete)
};

export async function loadCoursesWithHoleStatus(
  supabase: SupabaseClient,
  tripId: string
): Promise<CourseLite[]> {
  const { data: courses } = await supabase
    .from("courses")
    .select("id,name,par,course_rating,slope,tee_name,yardage,address")
    .eq("trip_id", tripId)
    .order("name");
  const list = (courses ?? []) as Record<string, unknown>[];
  if (list.length === 0) return [];

  const ids = list.map((c) => c.id as string);
  const { data: holes } = await supabase
    .from("course_holes")
    .select("course_id")
    .in("course_id", ids);
  const counts = new Map<string, number>();
  ((holes ?? []) as { course_id: string }[]).forEach((h) =>
    counts.set(h.course_id, (counts.get(h.course_id) ?? 0) + 1)
  );

  return list.map((c) => ({
    id: c.id as string,
    name: (c.name as string) ?? "Course",
    yardage: (c.yardage as number) ?? null,
    par: (c.par as number) ?? null,
    rating: (c.course_rating as number) ?? null,
    slope: (c.slope as number) ?? null,
    teeName: (c.tee_name as string) ?? null,
    address: (c.address as string) ?? null,
    holeCount: counts.get(c.id as string) ?? 0,
  }));
}

export async function loadCourseHoles(
  supabase: SupabaseClient,
  courseId: string
): Promise<CourseHole[]> {
  const { data } = await supabase
    .from("course_holes")
    .select("hole_number,par,stroke_index")
    .eq("course_id", courseId)
    .order("hole_number");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    hole: r.hole_number as number,
    par: r.par as number,
    si: r.stroke_index as number,
  }));
}

/** Replaces all 18 holes for a course (delete + insert, so re-confirming is safe). */
export async function saveCourseHoles(
  supabase: SupabaseClient,
  courseId: string,
  holes: CourseHole[]
): Promise<{ ok: boolean; error?: string }> {
  const del = await supabase.from("course_holes").delete().eq("course_id", courseId);
  if (del.error) return { ok: false, error: del.error.message };
  const rows = holes.map((h) => ({
    course_id: courseId,
    hole_number: h.hole,
    par: h.par,
    stroke_index: h.si,
  }));
  const { error } = await supabase.from("course_holes").insert(rows);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Parse the typed format:  (hole1,par4,hc1),(hole2,par3,hc9),...
 * Tolerant of spaces, missing "hole"/"par"/"hc" words, and newlines.
 */
export function parseHoleText(input: string): { holes: CourseHole[]; issues: string[] } {
  const issues: string[] = [];
  const holes: CourseHole[] = [];
  const groups = input.match(/\(([^)]*)\)/g) ?? [];
  groups.forEach((g) => {
    const nums = (g.match(/\d+(\.\d+)?/g) ?? []).map(Number);
    if (nums.length >= 3) holes.push({ hole: nums[0], par: nums[1], si: nums[2] });
  });
  if (holes.length !== 18) issues.push(`Found ${holes.length} holes, expected 18.`);
  const sis = holes.map((h) => h.si);
  if (new Set(sis).size !== sis.length) issues.push("Stroke indexes repeat - each 1-18 should appear once.");
  holes.forEach((h) => {
    if (![3, 4, 5].includes(h.par)) issues.push(`Hole ${h.hole}: par ${h.par} looks wrong.`);
    if (!(h.si >= 1 && h.si <= 18)) issues.push(`Hole ${h.hole}: stroke index ${h.si} out of range.`);
  });
  return { holes, issues };
}

/** Downscale + JPEG-encode an image in the browser before sending it to the parser. */
export async function imageToBase64(file: File, maxEdge = 1600): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}

export async function createCourse(
  supabase: SupabaseClient,
  tripId: string,
  input: { name: string; par: number; teeName: string; yardage: number | null; rating: number | null; slope: number | null }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("courses").insert({
    trip_id: tripId,
    name: input.name,
    par: input.par,
    tee_name: input.teeName,
    yardage: input.yardage,
    course_rating: input.rating,
    slope: input.slope,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateCourse(
  supabase: SupabaseClient,
  courseId: string,
  patch: { name?: string; par?: number; teeName?: string; yardage?: number | null; rating?: number | null; slope?: number | null; address?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.par !== undefined) row.par = patch.par;
  if (patch.teeName !== undefined) row.tee_name = patch.teeName;
  if (patch.yardage !== undefined) row.yardage = patch.yardage;
  if (patch.rating !== undefined) row.course_rating = patch.rating;
  if (patch.slope !== undefined) row.slope = patch.slope;
  if (patch.address !== undefined) row.address = patch.address;
  const { error } = await supabase.from("courses").update(row).eq("id", courseId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export type CourseTee = {
  id: string;
  name: string;
  yardage: number | null;
  rating: number | null;
  slope: number | null;
};

export async function loadCourseTees(supabase: SupabaseClient, courseId: string): Promise<CourseTee[]> {
  const { data } = await supabase
    .from("course_tees")
    .select("id,name,yardage,rating,slope")
    .eq("course_id", courseId)
    .order("sort_order");
  return ((data ?? []) as Record<string, unknown>[]).map((t) => ({
    id: t.id as string,
    name: (t.name as string) ?? "",
    yardage: (t.yardage as number) ?? null,
    rating: (t.rating as number) ?? null,
    slope: (t.slope as number) ?? null,
  }));
}

export async function addCourseTee(
  supabase: SupabaseClient,
  courseId: string,
  tee: { name: string; yardage: number | null; rating: number | null; slope: number | null }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("course_tees").insert({ course_id: courseId, ...tee });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteCourseTee(supabase: SupabaseClient, teeId: string): Promise<void> {
  await supabase.from("course_tees").delete().eq("id", teeId);
}
