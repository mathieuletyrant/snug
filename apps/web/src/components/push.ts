import { useQuery } from "@tanstack/react-query";
import type { PushSettings } from "@snug/shared";
import { useCallback, useEffect, useState } from "react";
import { api, queryClient } from "@/api";

export type PushState = "loading" | "unsupported" | "denied" | "off" | "on";

const base64UrlToBytes = (value: string) => {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};

/**
 * This device's Web Push subscription. Needs the service worker (production build) and,
 * on iPhone, Snug added to the Home Screen and opened over HTTPS.
 */
export function usePush() {
  const { data: settings } = useQuery({ queryKey: ["push"], queryFn: () => api<PushSettings>("/push") });
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState("unsupported");
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      setState((await registration.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = useCallback(async () => {
    if (!settings) return;
    if ((await Notification.requestPermission()) !== "granted") return setState("denied");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(settings.publicKey),
    });
    await api("/push/subscriptions", { body: subscription.toJSON() });
    setState("on");
    await queryClient.invalidateQueries({ queryKey: ["push"] });
  }, [settings]);

  const disable = useCallback(async () => {
    const subscription = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (subscription) {
      await api("/push/subscriptions", { method: "DELETE", body: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
    }
    setState("off");
    await queryClient.invalidateQueries({ queryKey: ["push"] });
  }, []);

  return { state, devices: settings?.devices ?? 0, enable, disable };
}
