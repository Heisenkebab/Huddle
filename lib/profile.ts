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
