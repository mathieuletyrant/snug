import { localeOf } from "@snug/shared";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import { en, type Messages } from "./en";
import { fr } from "./fr";

export type { Messages };

const CATALOGS = { en, fr };

const I18n = createContext<Messages>(en);

/**
 * The app's language follows the instance's language setting (the TMDB one): French for "fr-…",
 * English otherwise. Before it's known (or when the server is unreachable), the browser's.
 */
export function I18nProvider({ language, children }: { language: string | undefined; children: ReactNode }) {
  const locale = localeOf(language ?? navigator.language);
  const messages = CATALOGS[locale];
  // Screen readers and the browser's own words (spellcheck, hyphenation) follow the page's language.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <I18n.Provider value={messages}>{children}</I18n.Provider>;
}

/** The app's words in the current language: `t.home.ready`, `t.home.left(3)`. */
export const useT = () => useContext(I18n);
