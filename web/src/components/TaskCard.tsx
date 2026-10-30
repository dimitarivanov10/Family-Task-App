import { formatDateTime, STATUS_BADGE_CLASSES, STATUS_LABELS } from "../lib/format";
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
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-slate-900">{task.title}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
        >
          {STATUS_LABELS[task.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">Срок: {formatDateTime(task.deadline)}</p>
      <p className="mt-1 text-xs text-slate-400">{assigneeNames.join(", ")}</p>
    </button>
  );
}
