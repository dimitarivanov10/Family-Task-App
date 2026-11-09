import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { enablePushNotifications, isIosNonStandalone } from "../lib/messaging";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "Неуспешно включване на известията.";
}

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
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
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
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <div className="flex items-center justify-between gap-3">
        <span>Включете известията, за да получавате напомняния за крайни срокове.</span>
        <button
          type="button"
          onClick={() => void handleEnable()}
          disabled={busy}
          className="shrink-0 rounded-lg bg-amber-600 px-3 py-1 font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {busy ? "…" : "Включи"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
