import ErrorNotice from "./ErrorNotice";
import PageHeader from "./PageHeader";

/** Seite innerhalb einer Reise, die (noch) nicht verfügbar ist – mit Kopfzeile, Sidebar/Tab-Leiste bleiben. */
export default function FeatureUnavailable({ title, text }: { title: string; text?: string }) {
  return (
    <>
      <PageHeader title={title} />
      <ErrorNotice text={text} />
    </>
  );
}
