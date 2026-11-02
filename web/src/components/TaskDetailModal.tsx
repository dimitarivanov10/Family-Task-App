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
  const {
    markSeen,
    acceptTask,
    completeTask,
    reopenTask,
    proposeDeadline,
    acceptDeadlineProposal,
  } = useTasks();
  const { history, loading: historyLoading, error: historyError } = useTaskHistory(family?.id ?? "", task.id);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");

  if (!family || !user) {
    return null;
  }

  const isAssignee = task.assignees.includes(user.uid);
  const isCreator = task.createdBy === user.uid;
  const assigneeNames = task.assignees.map((uid) => family.memberNames[uid] ?? uid);
  const operativeDeadline = task.effectiveDeadline ?? task.deadline;

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

  function startProposeDeadline() {
    const pad = (n: number) => String(n).padStart(2, "0");
    const d = operativeDeadline.toDate();
    setDeadlineInput(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
    setProposing(true);
  }

  async function handleProposeSubmit(e: FormEvent) {
    e.preventDefault();
    const deadline = new Date(deadlineInput).getTime();
    if (!Number.isFinite(deadline)) {
      setError("Невалиден срок.");
      return;
    }
    await runAction(async () => {
      await proposeDeadline(task.id, deadline);
      setProposing(false);
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

        <div className="mt-2 text-sm text-slate-500">
          <div className="flex items-center justify-between">
            <span>Срок: {formatDateTime(operativeDeadline)}</span>
            {isAssignee && task.status !== "done" && !task.proposedDeadline && !proposing && (
              <button type="button" onClick={startProposeDeadline} className="text-blue-600 hover:underline">
                Предложи нов срок
              </button>
            )}
          </div>
          {task.effectiveDeadline && (
            <p className="text-xs text-slate-400">Първоначален срок: {formatDateTime(task.deadline)}</p>
          )}
        </div>

        {task.proposedDeadline && (
          <div className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
            <p>
              Предложен нов срок: {formatDateTime(task.proposedDeadline)}
              {task.proposedBy && <> от {family.memberNames[task.proposedBy] ?? task.proposedBy}</>}
            </p>
            {isAssignee && (
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(() => acceptDeadlineProposal(task.id))}
                className="mt-1 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                Приеми новия срок
              </button>
            )}
          </div>
        )}

        {proposing && (
          <form onSubmit={handleProposeSubmit} className="mt-2 flex items-center gap-2">
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
              Предложи
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

        {(isAssignee || isCreator) && task.status === "done" && (
          <div className="mt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => reopenTask(task.id))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Отвори отново
            </button>
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-medium text-slate-700">История</h3>
          {historyError && <p className="mt-2 text-xs text-red-600">{historyError}</p>}
          {!historyError && historyLoading && (
            <p className="mt-2 text-xs text-slate-400">Зареждане…</p>
          )}
          {!historyError && !historyLoading && (
            <ul className="mt-2 space-y-1.5">
              {history.map((event) => (
                <li key={event.id} className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{HISTORY_LABELS[event.type]}</span>
                  {" — "}
                  {family.memberNames[event.byUid] ?? event.byUid} · {formatDateTime(event.at)}
                </li>
              ))}
            </ul>
          )}
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
