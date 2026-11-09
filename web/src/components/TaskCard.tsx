import {
  formatRelativeDeadline,
  getInitials,
  isOverdue,
  STATUS_ACCENT_CLASSES,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "../lib/format";
import type { Task } from "../types";

export default function TaskCard({
  task,
  assigneeNames,
  onOpen,
}: {
  task: Task;
  assigneeNames: string[];
  onOpen: () => void;
}) {
  const operativeDeadline = task.effectiveDeadline ?? task.deadline;
  const overdue = task.status !== "done" && task.status !== "declined" && isOverdue(operativeDeadline);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-surface p-4 text-left shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset] ring-1 ring-edge/60 transition hover:-translate-y-0.5 hover:ring-accent/50"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_ACCENT_CLASSES[task.status]}`} />

      <div className="flex items-start justify-between gap-2 pl-1">
        <h3 className="font-display text-sm font-semibold leading-snug text-ink">{task.title}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
        >
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      {task.description && (
        <p className="mt-1.5 line-clamp-2 pl-1 text-xs text-ink-dim">{task.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pl-1 pt-3">
        <div className="flex -space-x-2">
          {assigneeNames.slice(0, 3).map((name, i) => (
            <span
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-ink-dim ring-2 ring-surface"
              title={name}
            >
              {getInitials(name)}
            </span>
          ))}
          {assigneeNames.length > 3 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-[10px] font-semibold text-ink-dim ring-2 ring-surface">
              +{assigneeNames.length - 3}
            </span>
          )}
        </div>
        <span className={`text-xs font-medium ${overdue ? "text-rose" : "text-ink-faint"}`}>
          {formatRelativeDeadline(operativeDeadline)}
        </span>
      </div>
    </button>
  );
}
