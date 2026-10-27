import { useTranslations } from "next-intl";
import FeatureUnavailable from "@/components/FeatureUnavailable";

export default function Page() {
  const t = useTranslations("nav");
  return <FeatureUnavailable title={t("expenses")} />;
}
