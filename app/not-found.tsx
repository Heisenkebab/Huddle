import { useTranslations } from "next-intl";
import ErrorNotice from "@/components/ErrorNotice";

/** Jede unbekannte Seite außerhalb einer Reise, z. B. /irgendwas */
export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4 py-10">
      <h1 className="mb-5 text-[30px] font-extrabold tracking-tight">Huddle</h1>
      <ErrorNotice text={t("pageNotFound")} />
    </main>
  );
}
