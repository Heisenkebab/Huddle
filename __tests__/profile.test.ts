import { describe, expect, test } from "vitest";

import { isNameTaken, leastUsedColor, PROFILE_COLORS } from "@/lib/profile";

const [pine, blue, coral] = PROFILE_COLORS.map((c) => c.value);

describe("isNameTaken", () => {
  const members = [{ name: "Anna" }, { name: " Lena " }];

  test("matches a member's name", () => {
    expect(isNameTaken("Anna", members)).toBe(true);
  });

  test("ignores case and surrounding spaces on both sides", () => {
    expect(isNameTaken("  anna ", members)).toBe(true);
    expect(isNameTaken("LENA", members)).toBe(true);
  });

  test("a different name is not taken", () => {
    expect(isNameTaken("Anna M.", members)).toBe(false);
    expect(isNameTaken("Ann", members)).toBe(false);
  });

  test("an empty or blank name is never taken", () => {
    expect(isNameTaken("", members)).toBe(false);
    expect(isNameTaken("   ", [{ name: "  " }])).toBe(false);
  });
});

describe("leastUsedColor", () => {
  test("is the first palette color when nobody has one", () => {
    expect(leastUsedColor([])).toBe(pine);
  });

  test("skips colors members already have", () => {
    expect(leastUsedColor([{ color: pine }])).toBe(blue);
    expect(leastUsedColor([{ color: pine }, { color: blue }])).toBe(coral);
  });

  test("compares hex case-insensitively", () => {
    expect(leastUsedColor([{ color: pine.toLowerCase() }])).toBe(blue);
  });

  test("ignores colors outside the palette", () => {
    expect(leastUsedColor([{ color: "#000000" }])).toBe(pine);
  });

  test("when every color is taken, picks the least used one", () => {
    const all = PROFILE_COLORS.map((c) => ({ color: c.value }));
    expect(leastUsedColor(all)).toBe(pine);
    expect(leastUsedColor([...all, { color: pine }])).toBe(blue);
  });
});
