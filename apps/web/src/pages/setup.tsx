import type { Me } from "@snug/shared";
import { KeyRound } from "lucide-react";
import { LanguageSelect, TmdbKeyForm } from "../components/tmdb-settings";
import { Card, CenteredPage } from "../components/ui";

/** Shown after the first sign-up until the instance has a TMDB key. */
export function SetupPage({ me }: { me: Me }) {
  return (
    <CenteredPage
      wide
      icon={
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <KeyRound className="size-7" />
        </div>
      }
      title="One last thing"
      intro={
        me.isAdmin ? (
          <>
            Snug gets series, posters and episodes from TMDB. Create a free key at{" "}
            <a className="text-accent underline" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
              themoviedb.org/settings/api
            </a>{" "}
            and paste it here.
          </>
        ) : (
          "Your admin hasn't set up the TMDB key yet. Come back in a bit."
        )
      }
    >
      {me.isAdmin && (
        <Card className="space-y-5">
          <LanguageSelect />
          <TmdbKeyForm />
        </Card>
      )}
    </CenteredPage>
  );
}
