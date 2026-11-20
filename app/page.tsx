import { useTranslations } from "next-intl";

/** Home page: a trip is opened through its link /trip/<id>. */
export default function Home() {
  const t = useTranslations("home");

  return (
    <main className="mx-auto max-w-[480px] px-6 py-16 text-center">
      <h1 className="mb-2 text-[28px]">Huddle</h1>
      <p className="text-muted-foreground">{t("openTrip")}</p>
    </main>
  );
}
