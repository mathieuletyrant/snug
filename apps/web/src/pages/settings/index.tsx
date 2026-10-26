import type { Me } from "@snug/shared";
import { useSearchParams } from "wouter";
import { Chips, PageTitle } from "@/components/ui";
import { useT } from "@/i18n";
import { AdminSection } from "./admin";
import { ImportSection } from "./import";
import { IntegrationsSection } from "./integrations";
import { PreferencesSection } from "./preferences";

const SECTIONS = ["preferences", "integrations", "import", "admin"] as const;
type Section = (typeof SECTIONS)[number];

/** One section at a time, chosen by `?section=` so a link (or Back) lands on the right one. */
export function SettingsPage({ me }: { me: Me }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const sections = SECTIONS.filter((name) => name !== "admin" || me.isAdmin);
  const section: Section = sections.find((name) => name === params.get("section")) ?? "preferences";

  return (
    <>
      <PageTitle>{t.settings.title}</PageTitle>
      <Chips
        label={t.settings.sectionLabel}
        value={section}
        onChange={(value) => setParams({ section: value }, { replace: true })}
        options={sections.map((name) => ({ value: name, label: t.settings.sections[name] }))}
        className="-mx-4 mb-5 gap-2 px-4 pb-1 md:mx-0 md:px-0"
      />
      <div className="space-y-5">
        {section === "preferences" && <PreferencesSection />}
        {section === "integrations" && <IntegrationsSection isAdmin={me.isAdmin} />}
        {section === "import" && <ImportSection />}
        {section === "admin" && <AdminSection />}
      </div>
    </>
  );
}
