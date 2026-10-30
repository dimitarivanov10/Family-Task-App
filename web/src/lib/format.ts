import type { Timestamp } from "firebase/firestore";

export function formatDateTime(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleString("bg-BG", { dateStyle: "medium", timeStyle: "short" });
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Нова",
  seen: "Видяна",
  accepted: "Приета",
  done: "Завършена",
};

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  seen: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
};

export const HISTORY_LABELS: Record<string, string> = {
  created: "Задачата е създадена",
  seen: "Видяна",
  accepted: "Приета",
  status_changed: "Промяна на статуса",
  deadline_changed: "Промяна на срока",
};
