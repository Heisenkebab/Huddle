"use client";

import { Check, ChevronLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import PersonAvatar from "@/components/PersonAvatar";
import { Button } from "@/components/ui/button";
import { formatTripDates } from "@/lib/format";
import {
  isValidProfileName,
  PROFILE_COLOR_KEYS,
  PROFILE_COLORS,
} from "@/lib/profile";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { TripDetailsFromInvite } from "../_actions/get-trip-details-from-invite-id";
import { joinTrip } from "../_actions/join-trip";

// Avatars shown in the trip card before collapsing into "+n"
const MAX_AVATARS = 6;

// Errors join_trip can return that have their own message
const JOIN_ERRORS = [
  "invite_invalid",
  "name_invalid",
  "color_invalid",
  "not_authenticated",
] as const;
type JoinError = (typeof JOIN_ERRORS)[number] | "join_failed";

function asJoinError(error: string): JoinError {
  return (JOIN_ERRORS as readonly string[]).includes(error)
    ? (error as JoinError)
    : "join_failed";
}

/**
 * Mobile: one column, header → panel (a card) → body.
 * Laptop (design 1B): the panel is the green left half, header and body are
 * centered on the right. The panel is the same element on both, restyled from
 * lg up, so its texts exist only once in the DOM.
 */
const LAYOUT =
  "mx-auto flex min-h-dvh max-w-[480px] flex-col px-4 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:grid lg:max-w-none lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] lg:grid-rows-2 lg:gap-x-16 lg:gap-y-6 lg:p-6";
const HEADER =
  "lg:col-start-2 lg:row-start-1 lg:w-full lg:max-w-sm lg:self-end lg:justify-self-center";
const BODY =
  "lg:col-start-2 lg:row-start-2 lg:w-full lg:max-w-sm lg:self-start lg:justify-self-center";

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-3xl border bg-card p-5 shadow-sm lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:flex lg:flex-col lg:rounded-[28px] lg:border-0 lg:bg-primary lg:p-8 lg:text-primary-foreground lg:shadow-none">
      <p className="hidden font-bold lg:block">Huddle</p>
      {children}
    </section>
  );
}

/**
 * The invite page in two steps (design 1 · Beitreten): the trip with "Join",
 * then name and color for visitors without a profile. Visitors with a profile
 * join on the first step and keep their name and color.
 */
export default function InviteFlow({
  inviteId,
  trip,
  profile,
}: {
  inviteId: string;
  trip: TripDetailsFromInvite;
  profile: Profile | null;
}) {
  const t = useTranslations("invite");
  const router = useRouter();
  const [step, setStep] = useState<"invite" | "profile">("invite");
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PROFILE_COLORS.pine);
  const [error, setError] = useState<JoinError | null>(null);
  const [pending, startTransition] = useTransition();
  // Blocks a second click before the re-render disables the button, which
  // would otherwise sign in anonymously twice
  const submitting = useRef(false);

  const join = (joinName: string, joinColor?: string) => {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      const result = await joinTrip(inviteId, joinName, joinColor);
      if (result.success) {
        // Stays blocked: the page is about to change
        router.replace(`/trip/${result.data.tripId}`);
        return;
      }
      submitting.current = false;
      setError(asJoinError(result.error));
    });
  };

  const errorMessage = error && (
    <p role="alert" className="text-center text-sm text-destructive">
      {t(error)}
    </p>
  );

  return (
    <main className={LAYOUT}>
      {step === "invite" ? (
        <InviteStep
          trip={trip}
          profile={profile}
          pending={pending}
          error={errorMessage}
          onJoin={() =>
            profile ? join(profile.name) : (setError(null), setStep("profile"))
          }
        />
      ) : (
        <ProfileStep
          tripName={trip.name}
          name={name}
          color={color}
          pending={pending}
          error={errorMessage}
          onNameChange={setName}
          onColorChange={setColor}
          onBack={() => {
            setError(null);
            setStep("invite");
          }}
          onJoin={() => join(name, color)}
        />
      )}
    </main>
  );
}

function InviteStep({
  trip,
  profile,
  pending,
  error,
  onJoin,
}: {
  trip: TripDetailsFromInvite;
  profile: Profile | null;
  pending: boolean;
  error: React.ReactNode;
  onJoin: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();

  const dates = formatTripDates(trip.start_date, trip.end_date, locale);
  const meta = [dates, t("trip.people", { count: trip.members.length })]
    .filter(Boolean)
    .join(" · ");
  const shown = trip.members.slice(0, MAX_AVATARS);
  const hidden = trip.members.length - shown.length;

  return (
    <>
      <div className={HEADER}>
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
          {trip.name.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">
          {t("invite.title")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t.rich("invite.invitedBy", {
            name: trip.owner_name,
            owner: (chunks) => (
              <span className="font-semibold text-foreground">{chunks}</span>
            ),
          })}
        </p>
      </div>

      <Panel>
        <div className="lg:mt-auto">
          <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground lg:bg-primary-foreground lg:text-primary">
            {t("invite.tripBadge")}
          </span>
          <h2 className="mt-2 text-xl leading-tight font-bold lg:mt-3 lg:text-[44px] lg:leading-[1.05] lg:font-extrabold lg:tracking-tight">
            {trip.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground lg:mt-3 lg:text-primary-foreground/80">
            {meta}
          </p>
          <ul className="mt-3 flex lg:mt-4">
            {shown.map((m) => (
              <li key={m.id} className="-ml-1.5 first:ml-0">
                <PersonAvatar
                  name={m.name}
                  color={m.color}
                  size={28}
                  title={m.name}
                  className="ring-2 ring-card lg:ring-primary-foreground"
                />
              </li>
            ))}
            {hidden > 0 && (
              <li className="-ml-1.5 grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card lg:ring-primary-foreground">
                +{hidden}
              </li>
            )}
          </ul>
        </div>
      </Panel>

      <div className={cn("mt-6 flex flex-col gap-3 lg:mt-0", BODY)}>
        {profile && (
          <p className="text-center text-sm text-muted-foreground">
            {t("invite.joiningAs", { name: profile.name })}
          </p>
        )}
        <Button
          size="lg"
          className="h-12 w-full rounded-2xl text-base font-semibold"
          disabled={pending}
          onClick={onJoin}
        >
          {pending ? t("invite.joining") : t("invite.join")}
        </Button>
        {error}
      </div>
    </>
  );
}

function ProfileStep({
  tripName,
  name,
  color,
  pending,
  error,
  onNameChange,
  onColorChange,
  onBack,
  onJoin,
}: {
  tripName: string;
  name: string;
  color: string;
  pending: boolean;
  error: React.ReactNode;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onBack: () => void;
  onJoin: () => void;
}) {
  const t = useTranslations("invite");
  const tColors = useTranslations("colors");
  const trimmed = name.trim();
  const canJoin = isValidProfileName(name) && !pending;

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (canJoin) onJoin();
      }}
    >
      <div className={HEADER}>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={t("back")}
          onClick={onBack}
          className="mb-6 rounded-full bg-card"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">
          {t("profileTitle")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("profileSubtitle")}</p>
      </div>

      <Panel>
        <div className="flex flex-col items-center py-1 text-center lg:my-auto">
          <PersonAvatar
            name={trimmed || "?"}
            color={color}
            size={56}
            className="lg:size-24! lg:text-4xl! lg:ring-4 lg:ring-primary-foreground"
          />
          <p className="mt-3 max-w-full truncate text-lg font-bold lg:mt-4 lg:text-3xl">
            {trimmed || " "}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground lg:mt-1 lg:text-sm lg:text-primary-foreground/80">
            {t("newIn", { trip: tripName })}
          </p>
        </div>
      </Panel>

      <div className={cn("flex flex-1 flex-col lg:flex-none", BODY)}>
        <label
          htmlFor="invite-name"
          className="mt-6 mb-2 text-sm font-semibold lg:mt-0"
        >
          {t("nameLabel")}
        </label>
        <div className="flex h-12 items-center gap-3 rounded-2xl border-2 border-input bg-card px-3 transition-colors focus-within:border-primary">
          <PersonAvatar name={trimmed || "?"} color={color} size={24} />
          <input
            id="invite-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t("namePlaceholder")}
            autoComplete="nickname"
            autoFocus
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>

        <p id="invite-color" className="mt-6 mb-2 text-sm font-semibold">
          {t("colorLabel")}
        </p>
        <div
          role="radiogroup"
          aria-labelledby="invite-color"
          className="flex flex-wrap gap-2.5"
        >
          {PROFILE_COLOR_KEYS.map((key) => (
            <span key={key} className="relative grid place-items-center">
              <input
                type="radio"
                name="color"
                value={PROFILE_COLORS[key]}
                checked={color === PROFILE_COLORS[key]}
                onChange={() => onColorChange(PROFILE_COLORS[key])}
                aria-label={tColors(key)}
                style={{ background: PROFILE_COLORS[key] }}
                className="peer size-9 appearance-none rounded-full ring-offset-2 ring-offset-background outline-none checked:ring-2 checked:ring-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <Check
                aria-hidden
                strokeWidth={3}
                className="pointer-events-none absolute size-4 text-white opacity-0 peer-checked:opacity-100"
              />
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-8 lg:pt-6">
          {error}
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-2xl text-base font-semibold"
            disabled={!canJoin}
          >
            {pending ? t("joining") : t("join")}
          </Button>
        </div>
      </div>
    </form>
  );
}
