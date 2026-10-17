import { expect, test } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

test("all locales have the same message keys", () => {
  expect(keys(en).sort()).toEqual(keys(de).sort());
});
