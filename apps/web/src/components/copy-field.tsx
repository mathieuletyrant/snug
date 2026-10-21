import { Copy, RefreshCw } from "lucide-react";
import { useToast } from "./toast";
import { Button } from "./ui";

/** A secret URL to paste into another app: copy button, and optionally one to replace it. */
export function CopyField({ label, value, onRotate }: { label: string; value: string; onRotate?: () => void }) {
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <code className="min-w-0 flex-1 truncate rounded-2xl bg-raised px-4 py-3 text-xs" title={value}>
        {value}
      </code>
      <Button
        variant="ghost"
        aria-label={`Copy ${label}`}
        onClick={() => navigator.clipboard.writeText(value).then(() => toast({ message: "Copied" }))}
      >
        <Copy className="size-4" />
      </Button>
      {onRotate && (
        <Button variant="ghost" aria-label={`New ${label}`} title="New URL (the old one stops working)" onClick={onRotate}>
          <RefreshCw className="size-4" />
        </Button>
      )}
    </div>
  );
}
