import { useTranslations } from "next-intl";

/** Home page: a trip is opened through its link /trip/<id>. */
export default function Home() {
  const t = useTranslations("home");

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Huddle</h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>{t("openTrip")}</p>
    </main>
  );
}
