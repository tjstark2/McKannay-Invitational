-- ============================================================================
-- TourneyBirdie — Clubhouse, Phase 1 (Photos)
-- Paste this whole file into Supabase → SQL Editor and click "Run".
-- Safe to re-run: it drops/re-creates policies and skips the bucket if present.
-- ============================================================================

-- 1) Membership helper ------------------------------------------------------
-- True if the current user owns the trip OR has an active membership row.
-- SECURITY DEFINER so it can read trips/trip_members regardless of their RLS,
-- and so the same check can be reused by the storage policies below.
create or replace function public.is_trip_member(tid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1 from public.trips t
      where t.id = tid and t.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.trip_members m
      where m.trip_id = tid
        and m.user_id = auth.uid()
        and m.status = 'active'
    );
$$;

-- 2) trip_photos table ------------------------------------------------------
create table if not exists public.trip_photos (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption      text,
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);

create index if not exists trip_photos_trip_id_created_at_idx
  on public.trip_photos (trip_id, created_at desc);

alter table public.trip_photos enable row level security;

-- 3) Row policies (mirror the app's membership model) -----------------------
drop policy if exists trip_photos_select on public.trip_photos;
create policy trip_photos_select
  on public.trip_photos for select
  using ( public.is_trip_member(trip_id) );

drop policy if exists trip_photos_insert on public.trip_photos;
create policy trip_photos_insert
  on public.trip_photos for insert
  with check ( public.is_trip_member(trip_id) and user_id = auth.uid() );

drop policy if exists trip_photos_delete on public.trip_photos;
create policy trip_photos_delete
  on public.trip_photos for delete
  using ( user_id = auth.uid() );

-- 4) Private storage bucket -------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', false)
on conflict (id) do nothing;

-- 5) Storage object policies (path is "<trip_id>/<photo_id>.jpg") -----------
-- The first path segment is the trip id; gate on membership of that trip.
drop policy if exists trip_photos_storage_select on storage.objects;
create policy trip_photos_storage_select
  on storage.objects for select
  using (
    bucket_id = 'trip-photos'
    and public.is_trip_member( ((storage.foldername(name))[1])::uuid )
  );

drop policy if exists trip_photos_storage_insert on storage.objects;
create policy trip_photos_storage_insert
  on storage.objects for insert
  with check (
    bucket_id = 'trip-photos'
    and owner = auth.uid()
    and public.is_trip_member( ((storage.foldername(name))[1])::uuid )
  );

drop policy if exists trip_photos_storage_delete on storage.objects;
create policy trip_photos_storage_delete
  on storage.objects for delete
  using (
    bucket_id = 'trip-photos'
    and owner = auth.uid()
  );

-- Done. The Clubhouse photo feed is now backed and secured.
