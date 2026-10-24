import type { Me } from "@snug/shared";
import { useSearchParams } from "wouter";
import { Chips, PageTitle } from "../../components/ui";
import { useT } from "../../i18n";
import { AdminSection } from "./admin";
import { GeneralSection } from "./general";
import { ImportSection } from "./import";
import { IntegrationsSection } from "./integrations";

const SECTIONS = ["general", "integrations", "import", "admin"] as const;
type Section = (typeof SECTIONS)[number];

/** One section at a time, chosen by `?section=` so a link (or Back) lands on the right one. */
export function SettingsPage({ me }: { me: Me }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const sections = SECTIONS.filter((s) => s !== "admin" || me.isAdmin);
  const section: Section = sections.find((s) => s === params.get("section")) ?? "general";

  return (
    <>
      <PageTitle>{t.settings.title}</PageTitle>
      <Chips
        label={t.settings.sectionLabel}
        value={section}
        onChange={(value) => setParams({ section: value }, { replace: true })}
        options={sections.map((s) => ({ value: s, label: t.settings.sections[s] }))}
        className="-mx-4 mb-5 gap-2 px-4 pb-1 md:mx-0 md:px-0"
      />
      <div className="space-y-5">
        {section === "general" && <GeneralSection me={me} />}
        {section === "integrations" && <IntegrationsSection />}
        {section === "import" && <ImportSection />}
        {section === "admin" && <AdminSection />}
      </div>
    </>
  );
}
