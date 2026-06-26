"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, X, Clock, Users } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { AccountMenu } from "@/features/account/AccountMenu";
import {
  searchUsers,
  loadFriendsData,
  sendFriendRequest,
  respondToRequest,
  removeFriendship,
  displayName,
  handleAndLocation,
  type PublicProfile,
  type FriendsData,
} from "@/lib/supabase/friends";

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<FriendsData | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setData(await loadFriendsData(supabase, user.id));
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    refresh();
  }, [user, loading, router, refresh]);

  // debounced search
  useEffect(() => {
    if (!user) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSearching(true);
    let active = true;
    const t = setTimeout(async () => {
      const r = await searchUsers(supabase, q, user.id);
      if (active) {
        setResults(r);
        setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, user]);

  if (loading || !user || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  // relationship lookups for search results
  const friendIds = new Set(data.friends.map((f) => f.profile.id));
  const incomingIds = new Set(data.incoming.map((f) => f.profile.id));
  const outgoingIds = new Set(data.outgoing.map((f) => f.profile.id));

  async function add(otherId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;
    setNote(null);
    const res = await sendFriendRequest(supabase, user.id, otherId);
    if (!res.ok) {
      setNote(res.error ?? "Couldn't send request.");
      return;
    }
    await refresh();
  }

  async function respond(friendshipId: string, accept: boolean) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await respondToRequest(supabase, friendshipId, accept);
    await refresh();
  }

  async function remove(friendshipId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await removeFriendship(supabase, friendshipId);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="relative z-50 border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-anton text-4xl tracking-tight text-ink">Friends</h1>
        <p className="mt-1 text-slate-500">
          Find people by name, @username, city, or state.
        </p>

        {/* search */}
        <div className="mt-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            className="w-full rounded-2xl border-[1.5px] border-sand-200 bg-white px-4 py-3.5 text-base outline-none focus:border-fairway-900"
          />
          {note ? (
            <p className="mt-2 text-sm font-bold text-red-600">{note}</p>
          ) : null}

          {query.trim().length >= 2 ? (
            <div className="mt-3 space-y-2">
              {searching ? (
                <p className="text-sm text-slate-400">Searching…</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-slate-400">No one found.</p>
              ) : (
                results.map((p) => (
                  <PersonRow key={p.id} p={p}>
                    {friendIds.has(p.id) ? (
                      <Tag>Friends</Tag>
                    ) : incomingIds.has(p.id) ? (
                      <Tag>Wants to connect</Tag>
                    ) : outgoingIds.has(p.id) ? (
                      <Tag>
                        <Clock className="h-3.5 w-3.5" /> Requested
                      </Tag>
                    ) : (
                      <button
                        onClick={() => add(p.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-fairway-900 px-3.5 py-2 text-sm font-extrabold text-white"
                      >
                        <UserPlus className="h-4 w-4" /> Add
                      </button>
                    )}
                  </PersonRow>
                ))
              )}
            </div>
          ) : null}
        </div>

        {/* incoming requests */}
        {data.incoming.length > 0 ? (
          <section className="mt-9">
            <SectionTitle>
              Requests
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-black text-ink">
                {data.incoming.length}
              </span>
            </SectionTitle>
            <div className="mt-3 space-y-2">
              {data.incoming.map((f) => (
                <PersonRow key={f.friendshipId} p={f.profile}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(f.friendshipId, true)}
                      className="inline-flex items-center gap-1 rounded-full bg-fairway-900 px-3 py-2 text-sm font-extrabold text-white"
                    >
                      <Check className="h-4 w-4" /> Accept
                    </button>
                    <button
                      onClick={() => respond(f.friendshipId, false)}
                      className="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </PersonRow>
              ))}
            </div>
          </section>
        ) : null}

        {/* friends list */}
        <section className="mt-9">
          <SectionTitle>
            <Users className="h-5 w-5" /> Your Friends
            <span className="ml-1 text-slate-400">({data.friends.length})</span>
          </SectionTitle>
          {data.friends.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-sand-200 bg-white p-8 text-center">
              <p className="text-4xl">🫂</p>
              <p className="mt-3 font-black text-fairway-900">No Friends Yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Search above to find people and send a request.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {data.friends.map((f) => (
                <PersonRow key={f.friendshipId} p={f.profile}>
                  <button
                    onClick={() => remove(f.friendshipId)}
                    className="rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-bold text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </PersonRow>
              ))}
            </div>
          )}
        </section>

        {/* outgoing */}
        {data.outgoing.length > 0 ? (
          <section className="mt-9">
            <SectionTitle>Sent requests</SectionTitle>
            <div className="mt-3 space-y-2">
              {data.outgoing.map((f) => (
                <PersonRow key={f.friendshipId} p={f.profile}>
                  <button
                    onClick={() => remove(f.friendshipId)}
                    className="rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-bold text-slate-400 hover:text-red-600"
                  >
                    Cancel
                  </button>
                </PersonRow>
              ))}
            </div>
          </section>
        ) : null}

        <button
          onClick={() => router.push("/home")}
          className="mt-10 w-full rounded-2xl border border-sand-100 bg-white px-4 py-3.5 font-black text-fairway-900"
        >
          ← Back to My Tournaments
        </button>
      </main>
    </div>
  );
}

function PersonRow({
  p,
  children,
}: {
  p: PublicProfile;
  children: React.ReactNode;
}) {
  const initial = (p.username || p.first_name || "?").charAt(0).toUpperCase();
  return (
    <div className="flex items-center justify-between rounded-2xl border border-sand-100 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fairway-900 font-black text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-black text-ink">{displayName(p)}</p>
          <p className="truncate text-sm text-slate-500">
            {handleAndLocation(p)}
          </p>
        </div>
      </div>
      <div className="shrink-0 pl-3">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-anton text-2xl tracking-tight text-ink">
      {children}
    </h2>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sand-50 px-3 py-1.5 text-xs font-extrabold text-slate-500">
      {children}
    </span>
  );
}
