import type { Timestamp } from "firebase/firestore";

export function formatDateTime(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleString("bg-BG", { dateStyle: "medium", timeStyle: "short" });
}

// Short "due in..." label for a chore-board card — key info at a glance
// instead of a full date/time.
export function formatRelativeDeadline(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  const diffMs = ts.toMillis() - Date.now();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 0) {
    const overdueMin = -diffMin;
    if (overdueMin < 60) return "Просрочена";
    const overdueHours = Math.floor(overdueMin / 60);
    if (overdueHours < 24) return "Просрочена";
    const overdueDays = Math.floor(overdueHours / 24);
    return `Просрочена с ${overdueDays} ${overdueDays === 1 ? "ден" : "дни"}`;
  }

  if (diffMin < 60) return diffMin <= 1 ? "Сега" : `След ${diffMin} мин`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `След ${diffHours} ${diffHours === 1 ? "час" : "часа"}`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Утре";
  if (diffDays < 7) return `След ${diffDays} дни`;
  return ts.toDate().toLocaleDateString("bg-BG", { day: "numeric", month: "short" });
}

export function isOverdue(ts: Timestamp | null | undefined): boolean {
  if (!ts) return false;
  return ts.toMillis() < Date.now();
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Нова",
  seen: "Видяна",
  accepted: "Приета",
  done: "Завършена",
  declined: "Отказана",
};

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: "bg-sky-soft text-sky",
  seen: "bg-accent-soft text-accent",
  accepted: "bg-accent-soft text-accent",
  done: "bg-mint-soft text-mint",
  declined: "bg-rose-soft text-rose",
};

// Thin accent strip on the left edge of a task card, matching its status.
export const STATUS_ACCENT_CLASSES: Record<string, string> = {
  pending: "bg-sky",
  seen: "bg-accent",
  accepted: "bg-accent",
  done: "bg-mint",
  declined: "bg-rose",
};

export const HISTORY_LABELS: Record<string, string> = {
  created: "Задачата е създадена",
  seen: "Видяна",
  accepted: "Приета",
  status_changed: "Промяна на статуса",
  declined: "Отказана",
  deadline_proposed: "Предложен нов срок",
  deadline_accepted: "Приет нов срок",
};
