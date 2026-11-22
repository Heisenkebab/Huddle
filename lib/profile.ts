// Same limit as the profile_name_length check in the database
export const PROFILE_NAME_MAX_LENGTH = 50;

/** The database checks the trimmed name, so the limit applies trimmed */
export function isValidProfileName(name: unknown): name is string {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= PROFILE_NAME_MAX_LENGTH;
}

/** Same pattern as the profile_color_hex check, e.g. '#E0A526' */
export function isValidProfileColor(color: unknown): color is string {
  return typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color);
}

/** Colors to pick from when joining a trip, keyed by their message name */
export const PROFILE_COLORS = {
  pine: "#1E7461",
  blue: "#5B7BD5",
  coral: "#EF6B4A",
  amber: "#E0A526",
  purple: "#B55FB0",
  green: "#4F9F5A",
  teal: "#2A9DB5",
  pink: "#D9506E",
} as const;

export type ProfileColorKey = keyof typeof PROFILE_COLORS;
export type ProfileColor = (typeof PROFILE_COLORS)[ProfileColorKey];

/** The palette keys in display order, typed (Object.keys returns string[]) */
export const PROFILE_COLOR_KEYS = Object.keys(
  PROFILE_COLORS,
) as ProfileColorKey[];

/** Same name as a trip member, ignoring case and surrounding spaces */
export function isNameTaken(
  name: string,
  members: readonly { name: string }[],
): boolean {
  const wanted = name.trim().toLocaleLowerCase();
  if (!wanted) return false;
  return members.some((m) => m.name.trim().toLocaleLowerCase() === wanted);
}

/**
 * The palette color the fewest trip members have, earlier colors first on a
 * tie. So it's a free one while there is one, and spreads evenly after that.
 */
export function leastUsedColor(members: readonly { color: string }[]): string {
  const uses = (value: string) =>
    members.filter((m) => m.color.toUpperCase() === value.toUpperCase()).length;
  return Object.values(PROFILE_COLORS).reduce((best, c) =>
    uses(c) < uses(best) ? c : best,
  );
}
