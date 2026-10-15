import FeatureUnavailable from "@/components/FeatureUnavailable";

/** Jede unbekannte Seite innerhalb einer Reise, z. B. /trip/<id>/packliste */
export default function MissingTripPage() {
  return (
    <FeatureUnavailable
      title="Nicht gefunden"
      text="Diese Seite gibt es (noch) nicht."
    />
  );
}
