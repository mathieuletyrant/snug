import type { Me } from "@snug/shared";
import { useSearchParams } from "wouter";
import { Chips, PageTitle } from "../../components/ui";
import { AdminSection } from "./admin";
import { GeneralSection } from "./general";
import { ImportSection } from "./import";
import { IntegrationsSection } from "./integrations";

const SECTIONS = [
  { value: "general", label: "General" },
  { value: "integrations", label: "Integrations" },
  { value: "import", label: "Import" },
  { value: "admin", label: "Admin" },
] as const;
type Section = (typeof SECTIONS)[number]["value"];

/** One section at a time, chosen by `?section=` so a link (or Back) lands on the right one. */
export function SettingsPage({ me }: { me: Me }) {
  const [params, setParams] = useSearchParams();
  const sections = SECTIONS.filter((s) => s.value !== "admin" || me.isAdmin);
  const section: Section = sections.find((s) => s.value === params.get("section"))?.value ?? "general";

  return (
    <>
      <PageTitle>Settings</PageTitle>
      <Chips
        label="Settings section"
        value={section}
        onChange={(value) => setParams({ section: value }, { replace: true })}
        options={sections}
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
