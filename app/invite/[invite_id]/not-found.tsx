import { useTranslations } from "next-intl";

import ErrorNotice from "@/components/ErrorNotice";

/** Unknown, revoked or expired invite: no trip details, just the message */
export default function InviteNotFound() {
  const t = useTranslations("invite");
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4 py-10">
      <h1 className="mb-5 text-[30px] font-extrabold tracking-tight">Huddle</h1>
      <ErrorNotice text={t("invite_invalid")} />
    </main>
  );
}
