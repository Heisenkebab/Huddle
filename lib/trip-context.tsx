"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { getSupabase, isTripId } from "@/lib/supabase";
import { GUEST_NAME, useMember, type Member } from "@/lib/member";
import type { Person, Trip } from "@/lib/types";

type Author = { name: string; color: string };

type TripContextValue = {
  tripId: string;
  trip: Trip | null;
  loading: boolean;
  /** Fehlermeldung beim Laden der Reise (wird als Hinweis angezeigt) */
  error: string | null;
  /** Vorschaumodus: nichts wird gespeichert, alles nur lokal */
  localMode: boolean;
  member: Member;
  onlineCount: number;
  /** Mitreisende: online (Presence) + bekannte Autor:innen aus der Liste */
  people: Person[];
  setAuthors: (authors: Author[]) => void;
  enterLocalMode: (message: string) => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx)
    throw new Error(
      "useTrip muss innerhalb von <TripProvider> verwendet werden",
    );
  return ctx;
}

export function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof e.message === "string"
  )
    return e.message;
  return fallback;
}

export function TripProvider({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("trip");
  const member = useMember();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [online, setOnline] = useState<
    { key: string; name: string; color: string }[]
  >([]);
  const [authors, setAuthors] = useState<Author[]>([]);

  const enterLocalMode = (message: string) => {
    setError((prev) => prev ?? message);
    setLocalMode(true);
  };

  /* Reise laden */
  useEffect(() => {
    if (!isTripId(tripId)) {
      enterLocalMode(t("notFound"));
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await getSupabase()
          .from("trips")
          .select("*")
          .eq("id", tripId)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (!data) throw new Error(t("notFound"));
        setTrip({
          id: data.id,
          name: data.name ?? "",
          start_date: data.start_date ?? null,
          end_date: data.end_date ?? null,
        });
      } catch (e) {
        if (!cancelled) enterLocalMode(errorMessage(e, t("loadFailed")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  /* Wer ist gerade online (Supabase Presence) */
  useEffect(() => {
    if (loading || localMode || member.id === "ssr") return;
    let supabase: ReturnType<typeof getSupabase>;
    try {
      supabase = getSupabase();
    } catch {
      return;
    }
    const channel = supabase.channel(`presence:${tripId}`, {
      config: { presence: { key: member.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string; color: string }>();
        setOnline(
          Object.entries(state).map(([key, metas]) => ({
            key,
            name: metas[0]?.name ?? GUEST_NAME,
            color: metas[0]?.color ?? "#999",
          })),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED")
          await channel.track({ name: member.name, color: member.color });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, loading, localMode, member.id, member.name, member.color]);

  const people = useMemo<Person[]>(() => {
    const list: Person[] = [
      {
        key: member.id,
        name: member.name,
        color: member.color,
        online: true,
        isMe: true,
      },
    ];
    for (const o of online) {
      if (o.key === member.id) continue;
      list.push({
        key: o.key,
        name: o.name,
        color: o.color,
        online: true,
        isMe: false,
      });
    }
    const seen = new Set(list.map((p) => p.name.toLowerCase()));
    for (const a of authors) {
      if (seen.has(a.name.toLowerCase())) continue;
      seen.add(a.name.toLowerCase());
      list.push({
        key: `author:${a.name}`,
        name: a.name,
        color: a.color,
        online: false,
        isMe: false,
      });
    }
    return list.map((p) =>
      p.name === GUEST_NAME ? { ...p, name: t("guest") } : p,
    );
  }, [member, online, authors, t]);

  const value: TripContextValue = {
    tripId,
    trip,
    loading,
    error,
    localMode,
    member,
    onlineCount: Math.max(1, online.length),
    people,
    setAuthors,
    enterLocalMode,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
