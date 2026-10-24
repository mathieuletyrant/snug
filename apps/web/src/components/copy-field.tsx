import { Copy, RefreshCw } from "lucide-react";
import { Confirm } from "./confirm";
import { useToast } from "./toast";
import { useT } from "../i18n";
import { Button } from "./ui";

/**
 * A secret URL to paste into another app: copy button, and optionally one to replace it.
 * On a phone the URL gets its own full-width line, wrapped rather than cut, with the buttons below.
 */
export function CopyField({ label, value, onRotate }: { label: string; value: string; onRotate?: () => void }) {
  const toast = useToast();
  const t = useT();
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <code className="min-w-0 flex-1 rounded-2xl bg-raised px-4 py-3 text-xs break-all sm:truncate" title={value}>
        {value}
      </code>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          aria-label={t.integrations.copy(label)}
          className="flex-1 sm:flex-none"
          onClick={() => navigator.clipboard.writeText(value).then(() => toast({ message: t.common.copied }))}
        >
          <Copy className="size-4" />
          <span className="sm:hidden">{t.integrations.copyUrl}</span>
        </Button>
        {onRotate && (
          <Confirm
            title={t.integrations.replaceTitle}
            description={t.integrations.replaceBody}
            confirm={t.integrations.replace}
            onConfirm={onRotate}
          >
            <Button variant="ghost" aria-label={t.integrations.newUrl(label)} title={t.integrations.newUrlHelp}>
              <RefreshCw className="size-4" />
            </Button>
          </Confirm>
        )}
      </div>
    </div>
  );
}
