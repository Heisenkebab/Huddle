import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/i18n/config";
import de from "@/messages/de.json";
import en from "@/messages/en.json";

const messages = { de, en };

export function renderWithIntl(ui: ReactElement, locale: Locale = "de") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}
