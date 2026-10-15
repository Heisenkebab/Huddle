# Huddle · Einkaufsliste (Frontend, Initial-Setup)

Next.js (App Router) + Supabase + shadcn/ui (Tailwind CSS v4). Oberfläche auf Deutsch.

## Einbauen
1. Ordner `app/`, `components/`, `lib/`, `supabase/` sowie `components.json` und
   `postcss.config.mjs` ins Projekt kopieren.
   - `app/layout.tsx` und `app/globals.css` ersetzen eure bestehenden – ggf. zusammenführen.
   - Imports nutzen den Alias `@/*` → Projektwurzel (Standard bei create-next-app ohne `src/`).
     Mit `src/`-Ordner: alles nach `src/` legen.
2. Abhängigkeiten:
   ```
   npm i @supabase/supabase-js radix-ui vaul sonner next-themes lucide-react class-variance-authority clsx tailwind-merge
   npm i -D tailwindcss @tailwindcss/postcss postcss tw-animate-css
   ```
   Falls shadcn schon eingerichtet ist: `components.json`/`globals.css` behalten und nur die
   Theme-Farben aus `app/globals.css` übernehmen. Die Komponenten in `components/ui/` sind die
   Standard-Komponenten (new-york) und lassen sich mit `npx shadcn@latest add button input label badge
   card checkbox alert toggle toggle-group drawer dialog tooltip sonner` neu erzeugen – nur die Farbe
   `coral` (FAB) und `spacing` an der ToggleGroup werden zusätzlich genutzt.
3. `.env.local.example` → `.env.local` kopieren und URL + anon key eintragen.
4. Datenbank: beide Dateien in `supabase/migrations/` der Reihe nach ausführen (neu: `…_reisedaten.sql`
   für den Reisezeitraum), danach `supabase/seed.sql`
   (CLI: `supabase db reset` bzw. im Dashboard im SQL-Editor).
5. `npm run dev` → http://localhost:3000 leitet auf die Demo-Reise weiter
   (`NEXT_PUBLIC_TRIP_ID`, optional). Ohne die Variable: `/trip/<id>/shopping-list` direkt öffnen.

## Routen
| Route | Tab | Status |
| --- | --- | --- |
| `app/trip/[id]/shopping-list` | Einkauf | funktionsfähig |
| `app/trip/[id]/tasks` | Aufgaben | Error 418 - I'm a teapot |
| `app/trip/[id]/board` | Board | Error 418 - I'm a teapot |
| `app/trip/[id]/expenses` | Ausgaben | Error 418 - I'm a teapot |
| `app/trip/[id]/invoice` | Abrechnung | Error 418 - I'm a teapot |

`/trip/[id]` leitet auf `shopping-list` weiter. `app/trip/[id]/layout.tsx` enthält Sidebar (Laptop),
schwebende Tab-Leiste (Handy) und den `TripProvider` (Reise, Online-Status, Mitreisende).

## Ansichten
- **Handy (< 1024 px)**: schwebende, ganz runde Tab-Leiste, „+ Artikel“-Button, Bottom Sheet zum Bearbeiten
  (Gedrückthalten), Lösch-Toast als dunkle Pille mit „Rückgängig“.
- **Laptop (ab 1024 px)**: Sidebar mit Reise, Navigation, Mitreisenden und „Einladungslink kopieren“;
  Liste als Karte mit „Für WhatsApp kopieren“ und „Artikel hinzufügen“; Hover auf einer Zeile zeigt
  Bearbeiten/Löschen; Bearbeiten als zentrierter Dialog mit „Abbrechen“.
`params` wird als Promise gelesen (Next.js 15+).

## Was funktioniert
- **Einkauf**: Liste nach Kategorien, Echtzeit-Sync (Supabase Realtime), „x online“ über Presence
- Antippen = gekauft · Gedrückt halten (500 ms) = Artikel bearbeiten
- **Artikel hinzufügen/bearbeiten** (Bottom Sheet): Name, Menge mit Komma, Einheit, Kategorie (optional)
- Löschen mit „Rückgängig“ (5 s)
- **Aufgaben, Board, Ausgaben, Abrechnung**: „Diese Funktion ist derzeit nicht verfügbar.“ + „Error 418 - I'm a teapot“
- **Fehlende Seiten** zeigen dieselbe Karte: innerhalb einer Reise (`app/trip/[id]/[...slug]`) mit Navigation,
  sonst über `app/not-found.tsx`. Code und Text stehen zentral in `components/ErrorNotice.tsx`.
- Fehler (z. B. von Supabase) werden mit ihrer Meldung angezeigt (Alert bzw. Toast)

## Dark Mode
`next-themes` (Klasse `.dark` auf `<html>`), Standard = Systemeinstellung. Umschalter: Laptop unten in der
Sidebar (System · Hell · Dunkel), Handy als runder Button in der Kopfzeile. Auswahl wird im Browser gespeichert
(`huddle.theme`). Farben für beide Modi stehen in `app/globals.css` (`:root` bzw. `.dark`).

## shadcn/ui-Komponenten im Einsatz
Button, Input, Label, Badge (online), Card (418-Seite), Checkbox (Liste), Alert (Fehler),
ToggleGroup (Einheit, Kategorie), Drawer (Popup mobil), Dialog (Popup Laptop), Tooltip (Hover-Aktionen),
Sonner (Toasts).
Icons: lucide-react.

## Bewusst offen
- Feld „Beschreibung“ ist nicht im UI (Spalte `description` existiert schon in der DB).
- Anzeigename: kommt aus `localStorage` (`huddle.member`), sonst „Gast“ – Beitritt per Link folgt.
- „Mitreisende“ = wer gerade online ist + wer Artikel angelegt hat. Eine echte Mitgliederliste
  (Tabelle) kommt mit der Story „Reisezugang“.
- RLS ist für das Setup offen (anon darf alles). Vor dem Praxistest einschränken!
- Reise-ID kommt aus der URL (`[id]`, muss eine UUID sein).
- **Vorschaumodus**: Ist die ID ungültig, die Reise unbekannt oder Supabase nicht erreichbar/konfiguriert,
  erscheint die Fehlermeldung als Hinweis – die Liste bleibt aber voll bedienbar (hinzufügen, abhaken,
  bearbeiten, löschen). Änderungen leben dann nur im Browser und sind nach dem Neuladen weg.
  Zum Ausprobieren ohne Datenbank z. B. `/trip/test/shopping-list` öffnen.
