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
export const PROFILE_COLORS = [
  { key: "pine", value: "#1E7461" },
  { key: "blue", value: "#5B7BD5" },
  { key: "coral", value: "#EF6B4A" },
  { key: "amber", value: "#E0A526" },
  { key: "purple", value: "#B55FB0" },
  { key: "green", value: "#4F9F5A" },
  { key: "teal", value: "#2A9DB5" },
  { key: "pink", value: "#D9506E" },
] as const;

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
  return PROFILE_COLORS.reduce((best, c) =>
    uses(c.value) < uses(best.value) ? c : best,
  ).value;
}
