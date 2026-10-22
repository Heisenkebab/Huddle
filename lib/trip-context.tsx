"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { TripAccess } from "@/lib/trip-access";
import type { Person } from "@/lib/types";

type Author = { name: string; color: string };

type TripContextValue = TripAccess & {
  tripId: string;
  /** Fellow travellers: me + known authors from the list */
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
  const [authors, setAuthors] = useState<Author[]>([]);

  const people = useMemo<Person[]>(() => {
    const list: Person[] = [
      {
        key: profile.id,
        name: profile.name,
        color: profile.color,
        isMe: true,
      },
    ];
    const seen = new Set(list.map((p) => p.name.toLowerCase()));
    for (const a of authors) {
      if (seen.has(a.name.toLowerCase())) continue;
      seen.add(a.name.toLowerCase());
      list.push({
        key: `author:${a.name}`,
        name: a.name,
        color: a.color,
        isMe: false,
      });
    }
    return list;
  }, [profile, authors]);

  const value: TripContextValue = {
    ...access,
    tripId: trip.id,
    people,
    setAuthors,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
