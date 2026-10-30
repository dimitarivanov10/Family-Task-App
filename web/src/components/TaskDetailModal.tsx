import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";
import { useTasks } from "../context/TaskContext";
import { useTaskHistory } from "../hooks/useTaskHistory";
import { formatDateTime, HISTORY_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS } from "../lib/format";
import type { Task } from "../types";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "Възникна неочаквана грешка.";
}

export default function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { user } = useAuth();
  const { family } = useFamily();
  const { markSeen, acceptTask, completeTask, changeDeadline } = useTasks();
  const history = useTaskHistory(family?.id ?? "", task.id);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");

  if (!family || !user) {
    return null;
  }

  const isAssignee = task.assignees.includes(user.uid);
  const assigneeNames = task.assignees.map((uid) => family.memberNames[uid] ?? uid);

  async function runAction(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function startEditDeadline() {
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = task.deadline.toDate();
    setDeadlineInput(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
    setEditingDeadline(true);
  }

  async function handleDeadlineSubmit(e: FormEvent) {
    e.preventDefault();
    const deadline = new Date(deadlineInput).getTime();
    if (!Number.isFinite(deadline)) {
      setError("Невалиден срок.");
      return;
    }
    await runAction(async () => {
      await changeDeadline(task.id, deadline);
      setEditingDeadline(false);
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[task.status]}`}
          >
            {STATUS_LABELS[task.status]}
          </span>
        </div>

        {task.description && <p className="mt-2 text-sm text-slate-600">{task.description}</p>}

        <p className="mt-3 text-sm text-slate-500">Изпълнители: {assigneeNames.join(", ")}</p>

        <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
          <span>Срок: {formatDateTime(task.deadline)}</span>
          {task.status !== "done" && !editingDeadline && (
            <button type="button" onClick={startEditDeadline} className="text-blue-600 hover:underline">
              Промени
            </button>
          )}
        </div>

        {editingDeadline && (
          <form onSubmit={handleDeadlineSubmit} className="mt-2 flex items-center gap-2">
            <input
              type="datetime-local"
              required
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Запази
            </button>
          </form>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {isAssignee && task.status !== "done" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {task.status === "pending" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => markSeen(task.id))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Маркирай като видяна
              </button>
            )}
            {task.status !== "accepted" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => acceptTask(task.id))}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Приемам
              </button>
            )}
            {task.status === "accepted" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => completeTask(task.id))}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                Завърши
              </button>
            )}
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-medium text-slate-700">История</h3>
          <ul className="mt-2 space-y-1.5">
            {history.map((event) => (
              <li key={event.id} className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">{HISTORY_LABELS[event.type]}</span>
                {" — "}
                {family.memberNames[event.byUid] ?? event.byUid} · {formatDateTime(event.at)}
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Затвори
        </button>
      </div>
    </div>
  );
}
