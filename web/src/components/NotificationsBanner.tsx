import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { enablePushNotifications, isIosNonStandalone } from "../lib/messaging";
import { getErrorMessage } from "../lib/errors";

export default function NotificationsBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (isIosNonStandalone()) {
    return (
      <div className="bg-accent-soft px-4 py-2 text-center text-sm text-accent">
        На iPhone известията работят само след добавяне на приложението към
        началния екран: Споделяне → „Добавяне към началния екран“, след
        което отворете го оттам.
      </div>
    );
  }

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const result = await enablePushNotifications(user!.uid);
      if (result === "denied") {
        setError("Разрешението за известия е отказано в браузъра.");
      }
      if (result !== "unsupported") {
        setStatus(result);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-accent-soft px-4 py-2 text-sm text-accent">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <span>Включете известията, за да получавате напомняния за крайни срокове.</span>
        <button
          type="button"
          onClick={() => void handleEnable()}
          disabled={busy}
          className="shrink-0 rounded-full bg-accent px-3 py-1 font-semibold text-bg hover:bg-accent-strong disabled:opacity-60"
        >
          {busy ? "…" : "Включи"}
        </button>
      </div>
      {error && <p className="mx-auto mt-1 max-w-5xl text-xs text-rose">{error}</p>}
    </div>
  );
}
