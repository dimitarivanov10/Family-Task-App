import { useFamily } from "../context/FamilyContext";
import { formatDateTime, STATUS_BADGE_CLASSES, STATUS_LABELS } from "../lib/format";
import type { Task } from "../types";

// A personal record of every task the user was ever assignee or creator
// of in this family, regardless of status — including archived/cancelled
// ones that no longer show on the active board. Nothing here is a new
// Firestore read: TaskContext already fetches the full set, this just
// presents it differently.
export default function TaskHistoryModal({
  tasks,
  onClose,
  onOpenTask,
}: {
  tasks: Task[];
  onClose: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const { activeFamily } = useFamily();

  const sorted = tasks
    .slice()
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-surface p-6 shadow-xl shadow-black/30 ring-1 ring-edge/60">
        <h2 className="font-display text-lg font-semibold text-ink">История на задачите</h2>
        <p className="mt-1 text-xs text-ink-dim">
          Всички задачи, в които сте участвали — включително завършени, отказани и архивирани.
        </p>

        <ul className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {sorted.length === 0 && <p className="text-sm text-ink-dim">Няма задачи все още.</p>}
          {sorted.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onOpenTask(task.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                  <p className="truncate text-xs text-ink-faint">
                    {task.assignees.map((uid) => activeFamily?.memberNames[uid] ?? uid).join(", ")} ·{" "}
                    {formatDateTime(task.createdAt)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
                >
                  {STATUS_LABELS[task.status]}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full border border-edge px-4 py-2 text-sm font-medium text-ink-dim hover:text-ink"
        >
          Затвори
        </button>
      </div>
    </div>
  );
}
