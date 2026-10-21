import { Copy, RefreshCw } from "lucide-react";
import { Confirm } from "./confirm";
import { useToast } from "./toast";
import { Button } from "./ui";

/**
 * A secret URL to paste into another app: copy button, and optionally one to replace it.
 * On a phone the URL gets its own full-width line, wrapped rather than cut, with the buttons below.
 */
export function CopyField({ label, value, onRotate }: { label: string; value: string; onRotate?: () => void }) {
  const toast = useToast();
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <code className="min-w-0 flex-1 rounded-2xl bg-raised px-4 py-3 text-xs break-all sm:truncate" title={value}>
        {value}
      </code>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          aria-label={`Copy ${label}`}
          className="flex-1 sm:flex-none"
          onClick={() => navigator.clipboard.writeText(value).then(() => toast({ message: "Copied" }))}
        >
          <Copy className="size-4" />
          <span className="sm:hidden">Copy URL</span>
        </Button>
        {onRotate && (
          <Confirm
            title="Replace this URL?"
            description="The current URL stops working right away: paste the new one wherever you used it."
            confirm="Replace"
            onConfirm={onRotate}
          >
            <Button variant="ghost" aria-label={`New ${label}`} title="New URL (the old one stops working)">
              <RefreshCw className="size-4" />
            </Button>
          </Confirm>
        )}
      </div>
    </div>
  );
}
