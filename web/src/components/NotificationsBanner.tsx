import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { enablePushNotifications } from "../lib/messaging";

export default function NotificationsBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission);
  }, []);

  if (!user || status === "granted" || status === "unsupported") {
    return null;
  }

  async function handleEnable() {
    setBusy(true);
    try {
      const result = await enablePushNotifications(user!.uid);
      if (result !== "unsupported") {
        setStatus(result);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span>Включете известията, за да получавате напомняния за крайни срокове.</span>
      <button
        type="button"
        onClick={handleEnable}
        disabled={busy}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {busy ? "…" : "Включи"}
      </button>
    </div>
  );
}
