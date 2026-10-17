import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Page from "@/app/page";
import { renderWithIntl } from "@/test/intl";

test("home page renders a heading", () => {
  renderWithIntl(<Page />);
  expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
});

test("home page is translated", () => {
  renderWithIntl(<Page />, "en");
  expect(
    screen.getByText("Open your trip using the invite link."),
  ).toBeDefined();
});
