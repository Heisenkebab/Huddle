import { useTranslations } from "next-intl";
import FeatureUnavailable from "@/components/FeatureUnavailable";

/** Jede unbekannte Seite innerhalb einer Reise, z. B. /trip/<id>/packliste */
export default function MissingTripPage() {
  const t = useTranslations("errors");
  return (
    <FeatureUnavailable title={t("notFoundTitle")} text={t("pageNotFound")} />
  );
}
