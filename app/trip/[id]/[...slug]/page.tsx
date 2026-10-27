import { useTranslations } from "next-intl";
import FeatureUnavailable from "@/components/FeatureUnavailable";

/** Any unknown page inside a trip, e.g. /trip/<id>/packing-list */
export default function MissingTripPage() {
  const t = useTranslations("errors");
  return (
    <FeatureUnavailable title={t("notFoundTitle")} text={t("pageNotFound")} />
  );
}
