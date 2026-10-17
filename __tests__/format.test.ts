import { describe, expect, test } from "vitest";
import {
  decimalSeparator,
  formatNumber,
  formatQuantity,
  formatTripDates,
  parseNumber,
} from "@/lib/format";

describe("formatNumber", () => {
  test("uses the locale's decimal separator", () => {
    expect(formatNumber(1.5, "de")).toBe("1,5");
    expect(formatNumber(1.5, "en")).toBe("1.5");
    expect(formatNumber(1000, "en")).toBe("1000");
  });
});

test("decimalSeparator", () => {
  expect(decimalSeparator("de")).toBe(",");
  expect(decimalSeparator("en")).toBe(".");
});

test("parseNumber accepts comma and dot", () => {
  expect(parseNumber("1,5")).toBe(1.5);
  expect(parseNumber("1.5")).toBe(1.5);
  expect(parseNumber("abc")).toBeNull();
});

test("formatQuantity", () => {
  expect(formatQuantity(2.5, "kg", "de")).toBe("2,5 kg");
  expect(formatQuantity(2.5, "kg", "en")).toBe("2.5 kg");
  expect(formatQuantity(3, null, "en")).toBe("3");
});

describe("formatTripDates", () => {
  test("German", () => {
    expect(formatTripDates("2026-06-12", null, "de")).toBe("12. Juni");
    expect(formatTripDates("2026-06-12", "2026-06-14", "de")).toBe(
      "12.–14. Juni",
    );
  });

  test("English", () => {
    expect(formatTripDates("2026-06-12", null, "en")).toBe("June 12");
    expect(formatTripDates("2026-06-12", "2026-06-14", "en")).toBe(
      "June 12\u2009–\u200914",
    );
  });

  test("no start date", () => {
    expect(formatTripDates(null, null, "en")).toBe("");
  });
});
