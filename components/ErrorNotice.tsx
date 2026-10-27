import { Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Text for HTTP status 418 (RFC 2324). Shown for all missing/unavailable pages. */
export const ERROR_CODE = "418";
export const ERROR_MESSAGE = "I'm a teapot";

export default function ErrorNotice({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  const t = useTranslations("errors");
  return (
    <Card
      role="status"
      className={cn(
        "gap-0 rounded-3xl py-10 shadow-none dark:shadow-[0_4px_20px_rgb(0_0_0/0.6)]",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center gap-1.5 text-center">
        <span className="mb-2 grid size-14 place-items-center rounded-full bg-secondary text-primary">
          <Coffee className="size-7" strokeWidth={1.8} />
        </span>
        <p className="font-semibold">{text ?? t("featureUnavailable")}</p>
        <p className="text-sm text-muted-foreground">
          Error {ERROR_CODE} - {ERROR_MESSAGE}
        </p>
      </CardContent>
    </Card>
  );
}
