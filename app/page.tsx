import { redirect } from "next/navigation";

/**
 * Initial-Setup: Mit NEXT_PUBLIC_TRIP_ID (z. B. die Demo-Reise aus seed.sql)
 * landet man direkt in der Einkaufsliste. Sonst öffnet man eine Reise über
 * ihren Link /trip/<id>.
 */
export default function Home() {
  const demoTrip = process.env.NEXT_PUBLIC_TRIP_ID;
  if (demoTrip) redirect(`/trip/${demoTrip}/shopping-list`);

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
      <p style={{ color: "var(--muted)", margin: 0 }}>
        Öffne deine Reise über den Einladungslink.
      </p>
    </main>
  );
}
