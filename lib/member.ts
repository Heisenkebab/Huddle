"use client";

import { useEffect, useState } from "react";

export type Member = { id: string; name: string; color: string };

const STORAGE_KEY = "huddle.member";
const AVATAR_COLORS = ["#E0A526", "#B65FB8", "#1E7461", "#EF6B4A", "#5B7BD5", "#3C9BB5"];

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/**
 * Anzeigename bleibt auf dem Gerät gespeichert (localStorage).
 * Initial-Setup: ohne gespeicherten Namen wird "Gast" verwendet –
 * der Beitritt per Link mit Namenseingabe folgt in der Story "Reisezugang".
 */
export function useMember(): Member {
  const [member, setMember] = useState<Member>({ id: "ssr", name: "Gast", color: AVATAR_COLORS[0] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Member>;
        if (parsed.name && parsed.id) {
          setMember({ id: parsed.id, name: parsed.name, color: parsed.color ?? colorFor(parsed.name) });
          return;
        }
      }
      const fresh: Member = { id: randomId(), name: "Gast", color: colorFor("Gast") };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      setMember(fresh);
    } catch {
      setMember({ id: randomId(), name: "Gast", color: colorFor("Gast") });
    }
  }, []);

  return member;
}
