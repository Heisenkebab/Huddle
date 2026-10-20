import { describe, expect, test } from "vitest";
import {
  decimalSeparator,
  formatNumber,
  formatQuantity,
  formatTripDates,
  isQuantityInput,
  isValidQuantity,
  maxDecimalsForUnit,
  parseNumber,
  quantityAfterUnitChange,
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

test("maxDecimalsForUnit", () => {
  expect(maxDecimalsForUnit("kg")).toBe(3);
  expect(maxDecimalsForUnit("l")).toBe(3);
  expect(maxDecimalsForUnit("g")).toBe(0);
  expect(maxDecimalsForUnit("ml")).toBe(0);
  expect(maxDecimalsForUnit("pcs")).toBe(0);
});

describe("isValidQuantity", () => {
  test.each([
    [200, "g"],
    [250, "ml"],
    [3, "pcs"],
    [1.234, "kg"],
    [0.5, "l"],
  ])("accepts %s %s", (quantity, unit) => {
    expect(isValidQuantity(quantity, unit)).toBe(true);
  });

  test.each([
    [200.2, "g"],
    [0.5, "ml"],
    [2.5, "pcs"],
    [1.2345, "kg"],
    [0, "l"],
    [-1, "kg"],
    [null, "kg"],
  ])("rejects %s %s", (quantity, unit) => {
    expect(isValidQuantity(quantity, unit)).toBe(false);
  });
});

describe("isQuantityInput", () => {
  test("allows up to three decimals for kg and l, while typing too", () => {
    expect(isQuantityInput("", "kg")).toBe(true);
    expect(isQuantityInput("1,", "kg")).toBe(true);
    expect(isQuantityInput("1,234", "kg")).toBe(true);
    expect(isQuantityInput("1.234", "l")).toBe(true);
    expect(isQuantityInput("1,2345", "kg")).toBe(false);
  });

  test("allows only whole numbers for g, ml and pieces", () => {
    expect(isQuantityInput("200", "g")).toBe(true);
    expect(isQuantityInput("200,", "g")).toBe(false);
    expect(isQuantityInput("0.5", "ml")).toBe(false);
    expect(isQuantityInput("2,5", "pcs")).toBe(false);
  });
});

describe("quantityAfterUnitChange", () => {
  test("switches to 100 for g/ml and back to 1", () => {
    expect(quantityAfterUnitChange(2, "kg", "g")).toBe(100);
    expect(quantityAfterUnitChange(250, "ml", "l")).toBe(1);
  });

  test("keeps the quantity between kg and l", () => {
    expect(quantityAfterUnitChange(1.234, "kg", "l")).toBe(1.234);
  });

  test("rounds to a whole number of pieces, at least 1", () => {
    expect(quantityAfterUnitChange(1.5, "kg", "pcs")).toBe(2);
    expect(quantityAfterUnitChange(0.25, "l", "pcs")).toBe(1);
  });
});
