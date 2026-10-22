"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TripAccess } from "@/lib/trip-access";
import type { Person } from "@/lib/types";

type Author = { name: string; color: string };

type TripContextValue = TripAccess & {
  tripId: string;
  onlineCount: number;
  /** Fellow travellers: online (presence) + known authors from the list */
  people: Person[];
  setAuthors: (authors: Author[]) => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used inside <TripProvider>");
  return ctx;
}

/**
 * Trip, own profile and role. The layout already checked sign-in and
 * membership on the server (getTripAccess), so nothing here is null.
 */
export function useTripAccess(): TripAccess {
  const { trip, profile, isOwner } = useTrip();
  return { trip, profile, isOwner };
}

export function TripProvider({
  access,
  children,
}: {
  access: TripAccess;
  children: React.ReactNode;
}) {
  const { trip, profile } = access;
  const [online, setOnline] = useState<
    { key: string; name: string; color: string }[]
  >([]);
  const [authors, setAuthors] = useState<Author[]>([]);

  /* Who is online right now (Supabase Presence) */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`presence:${trip.id}`, {
      config: { presence: { key: profile.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string; color: string }>();
        setOnline(
          Object.entries(state).flatMap(([key, [meta]]) =>
            meta ? [{ key, name: meta.name, color: meta.color }] : [],
          ),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED")
          await channel.track({ name: profile.name, color: profile.color });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip.id, profile.id, profile.name, profile.color]);

  const people = useMemo<Person[]>(() => {
    const list: Person[] = [
      {
        key: profile.id,
        name: profile.name,
        color: profile.color,
        online: true,
        isMe: true,
      },
    ];
    for (const o of online) {
      if (o.key === profile.id) continue;
      list.push({ ...o, online: true, isMe: false });
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
    return list;
  }, [profile, online, authors]);

  const value: TripContextValue = {
    ...access,
    tripId: trip.id,
    onlineCount: Math.max(1, online.length),
    people,
    setAuthors,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
