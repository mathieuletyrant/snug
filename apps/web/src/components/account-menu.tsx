import type { Me } from "@snug/shared";
import { LogOut } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { authClient } from "@/api";
import { useT } from "@/i18n";
import { Badge, COLLISION_PADDING, cx, MENU, MENU_ITEM } from "./ui";

/** The User's initial in a circle: who is signed in, in the nav. */
export function Avatar({ me, small = false }: { me: Me; small?: boolean }) {
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-accent/15 font-bold text-accent",
        small ? "size-6 text-xs" : "size-10",
      )}
    >
      {me.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/** The avatar at the end of the desktop nav, opening who is signed in and signing out. */
export function AccountMenu({ me }: { me: Me }) {
  const t = useT();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t.settings.account}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Avatar me={me} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={COLLISION_PADDING} className={MENU}>
          <div className="px-3 py-2.5">
            <p className="flex items-center gap-2 font-bold">
              {me.name}
              {me.isAdmin && <Badge tone="plain">{t.settings.admin}</Badge>}
            </p>
            <p className="text-sm text-muted">{me.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={() => authClient.signOut().then(() => location.assign("/"))}
            className={cx(MENU_ITEM, "text-rose")}
          >
            {t.settings.signOut}
            <LogOut className="size-4" />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
